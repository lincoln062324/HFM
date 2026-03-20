import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, Pressable, Alert, Image,
  ActivityIndicator, ScrollView, FlatList, Modal, Animated,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';

// Convert a local file URI to base64 without relying on EncodingType
const uriToBase64 = async (uri: string): Promise<string> => {
  // expo-file-system readAsStringAsync with string literal avoids the missing enum
  const result = await (FileSystem as any).readAsStringAsync(uri, { encoding: 'base64' });
  return result as string;
};
import Icon from 'react-native-vector-icons/FontAwesome';
import Icon5 from 'react-native-vector-icons/FontAwesome5';
import supabase from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface FoodEntry {
  id: string;
  imageUri: string;       // local URI (for display)
  imageUrl?: string;      // Supabase Storage public URL
  foodName: string;
  calories: number;
  benefits: string;
  nutrients?: string;
  timestamp: string;
  userId?: string;
}

interface CameraScreenProps {
  onClose: () => void;
  onFoodAnalyzed?: (food: FoodEntry) => void;
}

// ─── Claude Vision AI Analysis ───────────────────────────────────────────────
const analyzeFoodWithClaude = async (
  imageUri: string
): Promise<{ foodName: string; calories: number; benefits: string; nutrients: string }> => {
  // Read the image as base64
  const base64 = await uriToBase64(imageUri);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: base64 },
            },
            {
              type: 'text',
              text: `You are a professional nutritionist and food analyst. Analyze this food image and respond ONLY with a valid JSON object — no markdown, no backticks, no explanation. Use this exact shape:
{
  "foodName": "specific food name",
  "calories": number (integer, realistic per serving),
  "benefits": "2-3 sentences on health benefits",
  "nutrients": "key nutrients: protein Xg, carbs Xg, fat Xg, fiber Xg"
}
If no food is visible, use foodName "Unknown Food", calories 0, and brief notes.`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const raw = data.content?.[0]?.text ?? '{}';

  // Strip any accidental markdown fences
  const clean = raw.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(clean);

  return {
    foodName: parsed.foodName ?? 'Unknown Food',
    calories: typeof parsed.calories === 'number' ? parsed.calories : 0,
    benefits: parsed.benefits ?? '',
    nutrients: parsed.nutrients ?? '',
  };
};

// ─── Supabase helpers ─────────────────────────────────────────────────────────
const mapRow = (row: any): FoodEntry => ({
  id: row.id,
  imageUri: row.image_url ?? '',
  imageUrl: row.image_url ?? '',
  foodName: row.food_name,
  calories: row.calories,
  benefits: row.benefits ?? '',
  nutrients: row.nutrients ?? '',
  timestamp: row.analyzed_at,
  userId: row.user_id,
});

// ─── Component ────────────────────────────────────────────────────────────────
export default function CameraScreen({ onClose, onFoodAnalyzed }: CameraScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [isTakingPicture, setIsTakingPicture] = useState(false);
  const [lastPhoto, setLastPhoto] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    foodName: string; calories: number; benefits: string; nutrients: string;
  } | null>(null);
  const [savedPhotos, setSavedPhotos] = useState<FoodEntry[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<FoodEntry | null>(null);
  const [showPhotoDetailsModal, setShowPhotoDetailsModal] = useState(false);
  const [analyzingDots, setAnalyzingDots] = useState('');

  const cameraRef = useRef<CameraView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Animated pulse for analyze button
  useEffect(() => {
    if (isAnalyzing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
      const interval = setInterval(() => {
        setAnalyzingDots(d => d.length >= 3 ? '' : d + '.');
      }, 400);
      return () => clearInterval(interval);
    } else {
      pulseAnim.setValue(1);
    }
  }, [isAnalyzing]);

  // ── Fetch saved analyses from Supabase ──────────────────────────────────────
  const fetchSavedPhotos = useCallback(async () => {
    setDbLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      let query = supabase
        .from('food_analyses')
        .select('*')
        .order('analyzed_at', { ascending: false });

      if (user) {
        query = query.eq('user_id', user.id);
      } else {
        query = query.is('user_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      setSavedPhotos((data ?? []).map(mapRow));
    } catch (err: any) {
      console.error('fetchSavedPhotos error:', err?.message);
    } finally {
      setDbLoading(false);
    }
  }, []);

  // ── Realtime subscription ────────────────────────────────────────────────────
  useEffect(() => {
    fetchSavedPhotos();

    supabase.auth.getUser().then(({ data: { user } }) => {
      const filter = user
        ? `user_id=eq.${user.id}`
        : 'user_id=is.null';

      const channel = supabase
        .channel('food_analyses_realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'food_analyses',
          filter,
        }, () => fetchSavedPhotos())
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    });
  }, [fetchSavedPhotos]);

  // ── Take picture ─────────────────────────────────────────────────────────────
  const takePicture = async () => {
    if (!cameraRef.current || isTakingPicture) return;
    try {
      setIsTakingPicture(true);
      setAnalysisResult(null);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, skipProcessing: false });
      if (photo?.uri) {
        setLastPhoto(photo.uri);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to take picture. Please try again.');
    } finally {
      setIsTakingPicture(false);
    }
  };

  // ── Analyze with Claude + save to Supabase ───────────────────────────────────
  const handleAnalyzeFood = async () => {
    if (!lastPhoto) return;
    try {
      setIsAnalyzing(true);

      // 1. Run Claude Vision analysis
      const result = await analyzeFoodWithClaude(lastPhoto);
      setAnalysisResult(result);

      // 2. Get current user (nullable — guests allowed)
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id ?? null;

      // 3. Upload image to Supabase Storage
      const base64 = await uriToBase64(lastPhoto);
      const fileName = `food_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
      const filePath = userId ? `${userId}/${fileName}` : `guest/${fileName}`;
      const arrayBuffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

      const { error: uploadError } = await supabase.storage
        .from('food-images')
        .upload(filePath, arrayBuffer, { contentType: 'image/jpeg', upsert: false });

      let imageUrl = lastPhoto; // fallback to local URI
      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('food-images')
          .getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
      } else {
        console.warn('Storage upload failed (using local URI):', uploadError.message);
      }

      // 4. Insert row into food_analyses
      const { data: inserted, error: insertError } = await supabase
        .from('food_analyses')
        .insert({
          user_id: userId,
          image_url: imageUrl,
          food_name: result.foodName,
          calories: result.calories,
          benefits: result.benefits,
          nutrients: result.nutrients,
          analyzed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const foodEntry: FoodEntry = mapRow(inserted);

      // 5. Optimistic UI — prepend to local list immediately
      setSavedPhotos(prev => [foodEntry, ...prev]);

      if (onFoodAnalyzed) onFoodAnalyzed(foodEntry);

    } catch (err: any) {
      console.error('Analysis error:', err);
      Alert.alert('Analysis Failed', err?.message ?? 'Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── Delete entry ──────────────────────────────────────────────────────────────
  const handleDelete = async (entry: FoodEntry) => {
    Alert.alert('Delete', `Remove "${entry.foodName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          // Optimistic remove
          setSavedPhotos(prev => prev.filter(p => p.id !== entry.id));

          const { error } = await supabase
            .from('food_analyses')
            .delete()
            .eq('id', entry.id);

          if (error) {
            console.error('Delete error:', error.message);
            fetchSavedPhotos(); // re-sync on failure
          }
        },
      },
    ]);
  };

  // ── Permissions ───────────────────────────────────────────────────────────────
  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Requesting camera permission…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Icon name="camera" style={styles.permissionIcon} />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            Point your camera at any meal to instantly get calorie counts and nutritional insights powered by Claude AI.
          </Text>
          <Pressable style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Enable Camera</Text>
          </Pressable>
          <Pressable style={styles.closePermissionButton} onPress={onClose}>
            <Text style={styles.closePermissionButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing={facing} mode="picture">

        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.headerButton} onPress={onClose}>
            <Icon name="times" style={styles.headerIcon} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Icon5 name="brain" size={14} color="#c67ee2" />
            <Text style={styles.headerLabel}>AI Food Scanner</Text>
          </View>
          <Pressable style={styles.headerButton} onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}>
            <Icon name="refresh" style={styles.headerIcon} />
          </Pressable>
        </View>

        {/* Viewfinder overlay */}
        {!lastPhoto && !isAnalyzing && (
          <View style={styles.viewfinderContainer}>
            <View style={styles.viewfinderCornerTL} />
            <View style={styles.viewfinderCornerTR} />
            <View style={styles.viewfinderCornerBL} />
            <View style={styles.viewfinderCornerBR} />
            <Text style={styles.viewfinderHint}>Frame your meal</Text>
          </View>
        )}

        {/* Photo preview thumbnail */}
        {lastPhoto && (
          <View style={styles.photoPreview}>
            <Image source={{ uri: lastPhoto }} style={styles.previewImage} />
            <Pressable
              style={styles.clearPhotoButton}
              onPress={() => { setLastPhoto(null); setAnalysisResult(null); }}
            >
              <Icon name="times-circle" style={styles.clearPhotoIcon} />
            </Pressable>
          </View>
        )}

        {/* Analysis result card */}
        {analysisResult && !isAnalyzing && (
          <View style={styles.resultContainer}>
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Icon5 name="utensils" size={14} color="#c67ee2" />
                <Text style={styles.resultTitle} numberOfLines={1}>{analysisResult.foodName}</Text>
              </View>
              <View style={styles.caloriesRow}>
                <Icon name="fire" style={styles.caloriesIcon} />
                <Text style={styles.caloriesText}>{analysisResult.calories}</Text>
                <Text style={styles.caloriesUnit}> kcal</Text>
              </View>
              {analysisResult.nutrients ? (
                <Text style={styles.nutrientsText} numberOfLines={2}>{analysisResult.nutrients}</Text>
              ) : null}
              <Text style={styles.benefitsLabel}>Benefits</Text>
              <ScrollView style={styles.benefitsScroll} nestedScrollEnabled>
                <Text style={styles.benefitsText}>{analysisResult.benefits}</Text>
              </ScrollView>
              <View style={styles.savedBadge}>
                <Icon name="cloud-upload" size={10} color="#4CAF50" />
                <Text style={styles.savedBadgeText}> Saved to database</Text>
              </View>
            </View>
          </View>
        )}

        {/* Analyzing overlay */}
        {isAnalyzing && (
          <View style={styles.loadingContainer}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Icon5 name="brain" size={40} color="#c67ee2" />
            </Animated.View>
            <Text style={styles.loadingText}>Analyzing{analyzingDots}</Text>
            <Text style={styles.loadingSubtext}>Claude AI is reading your meal</Text>
            <ActivityIndicator size="small" color="#c67ee2" style={{ marginTop: 12 }} />
          </View>
        )}

        {/* Capture button */}
        <Pressable
          style={[styles.captureButton, (isTakingPicture || isAnalyzing) && styles.captureButtonDisabled]}
          onPress={takePicture}
          disabled={isTakingPicture || isAnalyzing}
        >
          <View style={styles.captureButtonInner} />
        </Pressable>

        {/* Bottom controls */}
        <View style={styles.controls}>
          <Pressable
            style={[styles.controlBtn, styles.analyzeButton, (!lastPhoto || isAnalyzing) && styles.btnDisabled]}
            onPress={handleAnalyzeFood}
            disabled={!lastPhoto || isAnalyzing}
          >
            <Icon5 name="brain" size={16} color={lastPhoto && !isAnalyzing ? '#2ea1ff' : '#666'} />
            <Text style={[styles.controlBtnText, (!lastPhoto || isAnalyzing) && styles.btnDisabledText]}>
              Analyze
            </Text>
          </Pressable>

          <Pressable
            style={[styles.controlBtn, styles.savedBtn]}
            onPress={() => { fetchSavedPhotos(); setShowStorageModal(true); }}
          >
            <Icon name="folder-open" size={16} color="#fcb92a" />
            <Text style={styles.controlBtnText}>
              Saved {savedPhotos.length > 0 ? `(${savedPhotos.length})` : ''}
            </Text>
          </Pressable>
        </View>

      </CameraView>

      {/* ── Saved Photos Modal ─────────────────────────────────────────────── */}
      <Modal
        visible={showStorageModal}
        animationType="slide"
        presentationStyle="overFullScreen"
        onRequestClose={() => setShowStorageModal(false)}
      >
        <View style={styles.modalContainer}>
          {/* Modal header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <Icon5 name="database" size={18} color="#c67ee2" />
              <Text style={styles.modalTitle}>  Food History</Text>
            </View>
            <Pressable onPress={() => setShowStorageModal(false)}>
              <Icon name="times" style={styles.modalCloseIcon} />
            </Pressable>
          </View>

          {/* Stats bar */}
          {savedPhotos.length > 0 && (
            <View style={styles.statsBar}>
              <View style={styles.statChip}>
                <Icon name="camera" size={12} color="#c67ee2" />
                <Text style={styles.statText}> {savedPhotos.length} scans</Text>
              </View>
              <View style={styles.statChip}>
                <Icon name="fire" size={12} color="#F3AF41" />
                <Text style={styles.statText}>
                  {' '}{savedPhotos.reduce((s, p) => s + p.calories, 0)} kcal total
                </Text>
              </View>
              <Pressable onPress={fetchSavedPhotos} style={styles.statChip}>
                <Icon name="refresh" size={12} color="#84d7f4" />
                <Text style={[styles.statText, { color: '#84d7f4' }]}> Refresh</Text>
              </Pressable>
            </View>
          )}

          {dbLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#c67ee2" />
              <Text style={styles.emptyText}>Loading from Supabase…</Text>
            </View>
          ) : savedPhotos.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon5 name="camera-retro" size={60} color="#333" />
              <Text style={styles.emptyText}>No analyses yet</Text>
              <Text style={styles.emptySubtext}>Take a photo of your meal and tap Analyze to get started</Text>
            </View>
          ) : (
            <FlatList
              data={savedPhotos}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.modalList}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.photoCard}
                  onPress={() => { setSelectedPhoto(item); setShowPhotoDetailsModal(true); }}
                >
                  {/* Food image */}
                  <Image
                    source={{ uri: item.imageUri || item.imageUrl }}
                    style={styles.photoCardImage}
                  />

                  {/* Info */}
                  <View style={styles.photoCardInfo}>
                    <Text style={styles.photoCardName} numberOfLines={1}>{item.foodName}</Text>
                    <View style={styles.photoCardCalRow}>
                      <Icon name="fire" size={14} color="#F3AF41" />
                      <Text style={styles.photoCardCal}> {item.calories} kcal</Text>
                    </View>
                    {item.nutrients ? (
                      <Text style={styles.photoCardNutrients} numberOfLines={1}>{item.nutrients}</Text>
                    ) : null}
                    <Text style={styles.photoCardTime}>
                      {new Date(item.timestamp).toLocaleString()}
                    </Text>
                  </View>

                  {/* Actions */}
                  <View style={styles.photoCardActions}>
                    <Pressable
                      style={styles.cardActionBtn}
                      onPress={() => { setSelectedPhoto(item); setShowPhotoDetailsModal(true); }}
                    >
                      <Icon name="eye" size={16} color="#4CAF50" />
                    </Pressable>
                    <Pressable style={[styles.cardActionBtn, styles.cardDeleteBtn]} onPress={() => handleDelete(item)}>
                      <Icon name="trash" size={16} color="#FF4444" />
                    </Pressable>
                  </View>
                </Pressable>
              )}
            />
          )}
        </View>
      </Modal>

      {/* ── Photo Details Modal ───────────────────────────────────────────── */}
      <Modal
        visible={showPhotoDetailsModal}
        animationType="slide"
        presentationStyle="overFullScreen"
        onRequestClose={() => setShowPhotoDetailsModal(false)}
      >
        <View style={styles.detailsContainer}>
          {selectedPhoto && (
            <>
              <Image
                source={{ uri: selectedPhoto.imageUri || selectedPhoto.imageUrl }}
                style={styles.detailsImage}
              />

              {/* Close button overlay */}
              <Pressable
                style={styles.detailsCloseBtn}
                onPress={() => { setShowPhotoDetailsModal(false); setSelectedPhoto(null); }}
              >
                <Icon name="times" size={18} color="#fff" />
              </Pressable>

              <ScrollView style={styles.detailsScroll} contentContainerStyle={styles.detailsContent}>
                {/* Food name + AI badge */}
                <View style={styles.detailsNameRow}>
                  <Text style={styles.detailsTitle}>{selectedPhoto.foodName}</Text>
                  <View style={styles.aiBadge}>
                    <Icon5 name="brain" size={10} color="#c67ee2" />
                    <Text style={styles.aiBadgeText}> AI</Text>
                  </View>
                </View>

                {/* Calories */}
                <View style={styles.detailsCalRow}>
                  <Icon name="fire" size={28} color="#F3AF41" />
                  <Text style={styles.detailsCal}> {selectedPhoto.calories}</Text>
                  <Text style={styles.detailsCalUnit}> kcal</Text>
                </View>

                {/* Nutrients */}
                {selectedPhoto.nutrients ? (
                  <View style={styles.nutrientsCard}>
                    <Icon5 name="leaf" size={12} color="#4CAF50" />
                    <Text style={styles.nutrientsCardText}> {selectedPhoto.nutrients}</Text>
                  </View>
                ) : null}

                {/* Benefits */}
                <Text style={styles.detailsSectionLabel}>Health Benefits</Text>
                <Text style={styles.detailsBenefits}>{selectedPhoto.benefits}</Text>

                {/* Metadata */}
                <View style={styles.detailsMeta}>
                  <Icon5 name="clock" size={12} color="#666" />
                  <Text style={styles.detailsTime}>
                    {' '}{new Date(selectedPhoto.timestamp).toLocaleString()}
                  </Text>
                </View>
                {selectedPhoto.imageUrl && (
                  <View style={styles.detailsMeta}>
                    <Icon name="cloud" size={12} color="#4CAF50" />
                    <Text style={[styles.detailsTime, { color: '#4CAF50' }]}> Stored in Supabase</Text>
                  </View>
                )}
              </ScrollView>

              <Pressable
                style={styles.detailsBackBtn}
                onPress={() => { setShowPhotoDetailsModal(false); setSelectedPhoto(null); }}
              >
                <Icon name="arrow-left" size={14} color="#c67ee2" />
                <Text style={styles.detailsBackText}>  Back to History</Text>
              </Pressable>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#15041f' },
  message: { color: '#FFFFFF', fontSize: 18, textAlign: 'center', padding: 20 },
  camera: { flex: 1, width: '100%', height: '100%' },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingTop: 50, paddingHorizontal: 20,
  },
  headerButton: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center',
  },
  headerIcon: { fontSize: 20, color: '#FFFFFF' },
  headerCenter: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    gap: 6,
  },
  headerLabel: { fontSize: 13, fontWeight: '700', color: '#c67ee2', letterSpacing: 0.5 },

  // Viewfinder
  viewfinderContainer: {
    position: 'absolute', top: '25%', left: '15%',
    width: '70%', height: '40%', justifyContent: 'center', alignItems: 'center',
  },
  viewfinderCornerTL: {
    position: 'absolute', top: 0, left: 0,
    width: 30, height: 30, borderTopWidth: 3, borderLeftWidth: 3, borderColor: '#c67ee2',
  },
  viewfinderCornerTR: {
    position: 'absolute', top: 0, right: 0,
    width: 30, height: 30, borderTopWidth: 3, borderRightWidth: 3, borderColor: '#c67ee2',
  },
  viewfinderCornerBL: {
    position: 'absolute', bottom: 0, left: 0,
    width: 30, height: 30, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: '#c67ee2',
  },
  viewfinderCornerBR: {
    position: 'absolute', bottom: 0, right: 0,
    width: 30, height: 30, borderBottomWidth: 3, borderRightWidth: 3, borderColor: '#c67ee2',
  },
  viewfinderHint: { fontSize: 13, color: 'rgba(255,255,255,0.6)', letterSpacing: 0.5 },

  // Photo preview
  photoPreview: {
    position: 'absolute', top: 115, right: 15,
    width: 90, height: 90, borderRadius: 12,
    overflow: 'hidden', borderWidth: 2, borderColor: '#c67ee2',
  },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  clearPhotoButton: { position: 'absolute', top: 4, right: 4 },
  clearPhotoIcon: { fontSize: 20, color: '#FF4444' },

  // Result card
  resultContainer: { position: 'absolute', top: 115, left: 15, right: 115 },
  resultCard: {
    backgroundColor: 'rgba(21,4,31,0.96)', borderRadius: 16,
    padding: 14, borderWidth: 1.5, borderColor: '#c67ee2',
  },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  resultTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', flex: 1 },
  caloriesRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 },
  caloriesIcon: { fontSize: 16, color: '#F3AF41', marginRight: 6 },
  caloriesText: { fontSize: 22, fontWeight: '800', color: '#F3AF41' },
  caloriesUnit: { fontSize: 13, color: '#F3AF41', opacity: 0.8 },
  nutrientsText: { fontSize: 11, color: '#84d7f4', marginBottom: 6, lineHeight: 15 },
  benefitsLabel: { fontSize: 11, fontWeight: '700', color: '#c67ee2', marginBottom: 3 },
  benefitsScroll: { maxHeight: 60 },
  benefitsText: { fontSize: 11, color: '#CCCCCC', lineHeight: 16 },
  savedBadge: {
    flexDirection: 'row', alignItems: 'center', marginTop: 8,
    paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(198,126,226,0.2)',
  },
  savedBadgeText: { fontSize: 10, color: '#4CAF50' },

  // Loading
  loadingContainer: {
    position: 'absolute', top: '35%', left: 20, right: 20,
    backgroundColor: 'rgba(21,4,31,0.97)', borderRadius: 24,
    padding: 32, alignItems: 'center', borderWidth: 1.5, borderColor: '#c67ee2',
  },
  loadingText: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginTop: 16 },
  loadingSubtext: { fontSize: 13, color: '#CCCCCC', marginTop: 4 },

  // Capture
  captureButton: {
    position: 'absolute', bottom: 110, alignSelf: 'center',
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center',
    borderWidth: 4, borderColor: '#c67ee2', left: '37%',
  },
  captureButtonDisabled: { opacity: 0.4 },
  captureButtonInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#15041f' },

  // Bottom controls
  controls: {
    position: 'absolute', bottom: 50, width: '100%',
    flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center',
  },
  controlBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 20, paddingVertical: 13, borderRadius: 25,
    gap: 8, minWidth: 120,
  },
  analyzeButton: { backgroundColor: 'rgba(21,4,31,0.9)', borderWidth: 1, borderColor: '#2ea1ff' },
  savedBtn: { backgroundColor: 'rgba(21,4,31,0.9)', borderWidth: 1, borderColor: '#fcb92a' },
  controlBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  btnDisabled: { opacity: 0.4, borderColor: '#444' },
  btnDisabledText: { color: '#666' },

  // Permission
  permissionContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  permissionIcon: { fontSize: 64, color: '#c67ee2', marginBottom: 20 },
  permissionTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginBottom: 12, textAlign: 'center' },
  permissionText: { fontSize: 15, color: '#CCCCCC', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  permissionButton: {
    backgroundColor: '#c67ee2', paddingHorizontal: 36, paddingVertical: 16,
    borderRadius: 28, marginBottom: 12,
  },
  permissionButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  closePermissionButton: { paddingVertical: 12 },
  closePermissionButtonText: { fontSize: 15, color: '#888' },

  // Storage Modal
  modalContainer: { flex: 1, backgroundColor: '#12001a' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 22, paddingVertical: 20, paddingTop: 55,
    borderBottomWidth: 1, borderBottomColor: 'rgba(198,126,226,0.2)',
  },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  modalCloseIcon: { fontSize: 22, color: '#888' },

  // Stats bar
  statsBar: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  statChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 10,
    paddingVertical: 6, borderRadius: 20,
  },
  statText: { fontSize: 12, color: '#CCCCCC', fontWeight: '600' },

  // Empty state
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#CCCCCC' },
  emptySubtext: { fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 20, paddingHorizontal: 40 },

  // Photo card
  modalList: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 30 },
  photoCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1e1031', borderRadius: 16,
    marginBottom: 10, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(198,126,226,0.15)',
  },
  photoCardImage: { width: 80, height: 80, resizeMode: 'cover' },
  photoCardInfo: { flex: 1, padding: 12, gap: 3 },
  photoCardName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  photoCardCalRow: { flexDirection: 'row', alignItems: 'center' },
  photoCardCal: { fontSize: 14, fontWeight: '700', color: '#F3AF41' },
  photoCardNutrients: { fontSize: 11, color: '#84d7f4' },
  photoCardTime: { fontSize: 11, color: '#555' },
  photoCardActions: { flexDirection: 'column', gap: 6, paddingRight: 12 },
  cardActionBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(76,175,80,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  cardDeleteBtn: { backgroundColor: 'rgba(255,68,68,0.15)' },

  // Photo Details Modal
  detailsContainer: { flex: 1, backgroundColor: '#12001a' },
  detailsImage: { width: '100%', height: 280, resizeMode: 'cover' },
  detailsCloseBtn: {
    position: 'absolute', top: 50, right: 18,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center',
  },
  detailsScroll: { flex: 1 },
  detailsContent: { padding: 24, paddingBottom: 12 },
  detailsNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  detailsTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', flex: 1 },
  aiBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(198,126,226,0.2)', paddingHorizontal: 8,
    paddingVertical: 4, borderRadius: 10,
  },
  aiBadgeText: { fontSize: 11, color: '#c67ee2', fontWeight: '700' },
  detailsCalRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 14 },
  detailsCal: { fontSize: 36, fontWeight: '900', color: '#F3AF41' },
  detailsCalUnit: { fontSize: 16, color: '#F3AF41', opacity: 0.7 },
  nutrientsCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.1)', padding: 10,
    borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(76,175,80,0.2)',
  },
  nutrientsCardText: { fontSize: 13, color: '#81c784', flex: 1 },
  detailsSectionLabel: { fontSize: 14, fontWeight: '700', color: '#c67ee2', marginBottom: 8 },
  detailsBenefits: { fontSize: 15, color: '#CCCCCC', lineHeight: 22, marginBottom: 16 },
  detailsMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  detailsTime: { fontSize: 12, color: '#555' },
  detailsBackBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 18, borderTopWidth: 1, borderTopColor: 'rgba(198,126,226,0.2)',
  },
  detailsBackText: { fontSize: 15, fontWeight: '600', color: '#c67ee2' },
});