import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, Pressable, Alert, Image,
  ActivityIndicator, ScrollView, FlatList, Modal,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import Icon from 'react-native-vector-icons/FontAwesome';
import supabase from '../lib/supabase';
import { ThemeColors, DEFAULT_THEME } from '../components/theme';


// ─── Types ────────────────────────────────────────────────────────────────────
export interface FoodEntry {
  id: string;
  imageUri: string;
  imageUrl?: string;
  foodName: string;
  calories: number;
  benefits: string;
  nutrients: string;
  status: 'pending' | 'analyzed' | 'error';
  timestamp: string;
}

interface CameraScreenProps {
  onClose: () => void;
  themeColors?: ThemeColors;
  onFoodAnalyzed?: (food: FoodEntry) => void;
}

// ─── Mock Food Analysis ──────────────────────────────────────────────────────
const MOCK_FOODS = [
  { foodName: 'Grilled Chicken Salad',  calories: 350, benefits: 'High protein, low carbs, rich in vitamins A and C, supports muscle growth and immune system.', nutrients: 'protein 38g, carbs 12g, fat 9g, fiber 4g' },
  { foodName: 'Pasta Carbonara',         calories: 550, benefits: 'Good source of carbohydrates for energy, protein from eggs and cheese, satisfying and filling.', nutrients: 'protein 22g, carbs 68g, fat 18g, fiber 3g' },
  { foodName: 'Vegetable Stir Fry',      calories: 220, benefits: 'Low calorie, high fiber, packed with antioxidants, promotes digestive health.', nutrients: 'protein 8g, carbs 30g, fat 7g, fiber 6g' },
  { foodName: 'Grilled Salmon',          calories: 400, benefits: 'Excellent source of omega-3 fatty acids and high quality protein, supports heart and brain health.', nutrients: 'protein 42g, carbs 0g, fat 22g, fiber 0g' },
  { foodName: 'Fruit Smoothie Bowl',     calories: 280, benefits: 'Rich in vitamins and antioxidants, natural sugars for quick energy, supports immune system.', nutrients: 'protein 6g, carbs 54g, fat 4g, fiber 7g' },
  { foodName: 'Quinoa Buddha Bowl',      calories: 420, benefits: 'Complete protein source, high in fiber, contains iron and magnesium for energy metabolism.', nutrients: 'protein 18g, carbs 58g, fat 12g, fiber 9g' },
  { foodName: 'Avocado Toast',           calories: 320, benefits: 'Healthy fats for heart health, fiber-rich, provides sustained energy and supports brain function.', nutrients: 'protein 10g, carbs 34g, fat 16g, fiber 8g' },
  { foodName: 'Greek Yogurt Parfait',    calories: 250, benefits: 'Probiotics for gut health, high protein for satiety, calcium for strong bones.', nutrients: 'protein 18g, carbs 32g, fat 5g, fiber 2g' },
  { foodName: 'Beef Tacos',              calories: 480, benefits: 'High in protein and iron, B vitamins support energy metabolism, satisfying and flavorful.', nutrients: 'protein 28g, carbs 40g, fat 18g, fiber 4g' },
  { foodName: 'Veggie Omelette',         calories: 300, benefits: 'Rich in complete protein, vitamins from vegetables, supports muscle repair and eye health.', nutrients: 'protein 22g, carbs 8g, fat 18g, fiber 2g' },
];

const mockAnalyzeFood = async (): Promise<{ foodName: string; calories: number; benefits: string; nutrients: string }> => {
  // Simulate a short analysis delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  return MOCK_FOODS[Math.floor(Math.random() * MOCK_FOODS.length)];
};

// ─── Supabase row mapper ──────────────────────────────────────────────────────
const mapRow = (row: any): FoodEntry => ({
  id: row.id,
  imageUri: row.image_url ?? '',
  imageUrl: row.image_url ?? '',
  foodName: row.food_name,
  calories: row.calories ?? 0,
  benefits: row.benefits ?? '',
  nutrients: row.nutrients ?? '',
  status: row.status ?? 'analyzed',
  timestamp: row.captured_at ?? row.analyzed_at ?? new Date().toISOString(),
});

// ─── Component ────────────────────────────────────────────────────────────────
export default function CameraScreen({ onClose, onFoodAnalyzed, themeColors = DEFAULT_THEME }: CameraScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [isTakingPicture, setIsTakingPicture] = useState(false);
  const [lastPhoto, setLastPhoto] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FoodEntry | null>(null);
  const [savedPhotos, setSavedPhotos] = useState<FoodEntry[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<FoodEntry | null>(null);
  const [showPhotoDetailsModal, setShowPhotoDetailsModal] = useState(false);

  const cameraRef = useRef<CameraView>(null);

  // ── Fetch all saved entries from Supabase ─────────────────────────────────
  const fetchSavedPhotos = useCallback(async () => {
    setDbLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let query = supabase
        .from('food_analyses')
        .select('*')
        .order('captured_at', { ascending: false });
      query = user ? query.eq('user_id', user.id) : query.is('user_id', null);
      const { data, error } = await query;
      if (error) throw error;
      setSavedPhotos((data ?? []).map(mapRow));
    } catch (err: any) {
      console.warn('fetchSavedPhotos:', err?.message);
    } finally {
      setDbLoading(false);
    }
  }, []);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    fetchSavedPhotos();
    const channel = supabase
      .channel('food_analyses_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'food_analyses' },
        () => fetchSavedPhotos())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchSavedPhotos]);

  // ── STEP 1: Take picture → upload image → insert pending row ─────────────
  const takePicture = async () => {
    if (!cameraRef.current || isTakingPicture) return;
    try {
      setIsTakingPicture(true);
      setAnalysisResult(null);

      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, skipProcessing: false });
      if (!photo?.uri) return;
      setLastPhoto(photo.uri);

      // Get user (nullable — guests allowed)
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id ?? null;
      // Use local URI as image_url (no storage upload needed for mock)
      const imageUrl = photo.uri;

      // Insert pending row immediately — shows in Saved right away
      const { data: inserted, error: insertErr } = await supabase
        .from('food_analyses')
        .insert({
          user_id: userId,
          image_url: imageUrl,
          food_name: 'Analyzing...',
          calories: 0,
          benefits: '',
          nutrients: '',
          status: 'pending',
          captured_at: new Date().toISOString(),
          analyzed_at: null,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      // Optimistic prepend to list
      setSavedPhotos(prev => [{ ...mapRow(inserted), imageUri: photo.uri }, ...prev]);

      // STEP 2: run AI analysis in background
      setIsAnalyzing(true);
      analyzeAndUpdate(photo.uri, inserted.id);

    } catch (err: any) {
      console.error('takePicture error:', err);
      Alert.alert('Error', 'Failed to take picture. Please try again.');
    } finally {
      setIsTakingPicture(false);
    }
  };

  // ── STEP 2: Claude analysis → UPDATE the existing pending row ────────────
  const analyzeAndUpdate = async (localUri: string, rowId: string) => {
    try {
      const result = await mockAnalyzeFood();

      const { data: updated, error: updateErr } = await supabase
        .from('food_analyses')
        .update({
          food_name: result.foodName,
          calories: result.calories,
          benefits: result.benefits,
          nutrients: result.nutrients,
          status: 'analyzed',
          analyzed_at: new Date().toISOString(),
        })
        .eq('id', rowId)
        .select()
        .single();

      if (updateErr) throw updateErr;

      const finishedEntry: FoodEntry = { ...mapRow(updated), imageUri: localUri };

      setSavedPhotos(prev => prev.map(p => p.id === rowId ? finishedEntry : p));
      setAnalysisResult(finishedEntry);

      if (onFoodAnalyzed) onFoodAnalyzed(finishedEntry);

    } catch (err: any) {
      console.error('Analysis error:', err?.message);
      await supabase
        .from('food_analyses')
        .update({ food_name: 'Analysis failed', status: 'error' })
        .eq('id', rowId);
      setSavedPhotos(prev =>
        prev.map(p => p.id === rowId ? { ...p, foodName: 'Analysis failed', status: 'error' as const } : p)
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── Delete entry ──────────────────────────────────────────────────────────
  const handleDelete = async (entry: FoodEntry) => {
    Alert.alert('Delete', `Remove "${entry.foodName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setSavedPhotos(prev => prev.filter(p => p.id !== entry.id));
          const { error } = await supabase.from('food_analyses').delete().eq('id', entry.id);
          if (error) { console.error('Delete error:', error.message); fetchSavedPhotos(); }
        },
      },
    ]);
  };

  // ── Permissions ────────────────────────────────────────────────────────────
  if (!permission) {
    return <View style={[styles.container, { backgroundColor: themeColors.background }]}><Text style={styles.message}>Requesting camera permission...</Text></View>;
  }
  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={styles.permissionContainer}>
          <Icon name="camera" style={styles.permissionIcon} />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>We need camera access to take photos of your meals and fitness activities.</Text>
          <Pressable style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </Pressable>
          <Pressable style={styles.closePermissionButton} onPress={onClose}>
            <Text style={styles.closePermissionButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <CameraView ref={cameraRef} style={styles.camera} facing={facing} mode="picture">

        {/* Header */}
        <View style={[styles.header, { backgroundColor: themeColors.secondary, borderBottomColor: themeColors.primary + "44" }]}>
          <Pressable style={styles.headerButton} onPress={onClose}>
            <Icon name="times" style={styles.headerIcon} />
          </Pressable>
          <Pressable style={styles.headerButton} onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}>
            <Icon name="refresh" style={styles.headerIcon} />
          </Pressable>
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            {isAnalyzing ? 'Analyzing your meal...' : facing === 'back' ? 'Point at your meal' : 'Take a selfie!'}
          </Text>
        </View>

        {/* Photo preview thumbnail with analyzing spinner overlay */}
        {lastPhoto && (
          <View style={styles.photoPreview}>
            <Image source={{ uri: lastPhoto }} style={styles.previewImage} />
            {isAnalyzing ? (
              <View style={styles.analyzingOverlay}>
                <ActivityIndicator size="small" color="#c67ee2" />
              </View>
            ) : (
              <Pressable style={styles.clearPhotoButton} onPress={() => { setLastPhoto(null); setAnalysisResult(null); }}>
                <Icon name="times-circle" style={styles.clearPhotoIcon} />
              </Pressable>
            )}
          </View>
        )}

        {/* Analysis result card */}
        {analysisResult && !isAnalyzing && (
          <View style={styles.resultContainer}>
            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>{analysisResult.foodName}</Text>
              <View style={styles.caloriesRow}>
                <Icon name="fire" style={styles.caloriesIcon} />
                <Text style={styles.caloriesText}>{analysisResult.calories} kcal</Text>
              </View>
              {analysisResult.nutrients ? (
                <Text style={styles.nutrientsText}>{analysisResult.nutrients}</Text>
              ) : null}
              <Text style={styles.benefitsLabel}>Benefits:</Text>
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
            <ActivityIndicator size="large" color="#c67ee2" />
            <Text style={styles.loadingText}>Analyzing food...</Text>
            <Text style={styles.loadingSubtext}>AI is scanning your meal</Text>
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
          <Pressable style={styles.viewSavedBtn} onPress={() => { fetchSavedPhotos(); setShowStorageModal(true); }}>
            <Icon name="folder-open" style={styles.viewSavedIcon} />
            <Text style={styles.viewSavedText}>Saved ({savedPhotos.length})</Text>
          </Pressable>
        </View>

      </CameraView>

      {/* ── Saved Photos Modal ───────────────────────────────────────────── */}
      <Modal visible={showStorageModal} animationType="slide" presentationStyle="overFullScreen" onRequestClose={() => setShowStorageModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowStorageModal(false)} />
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Saved Photos ({savedPhotos.length})</Text>
            <Pressable onPress={fetchSavedPhotos} style={{ marginRight: 16 }}>
              <Icon name="refresh" style={styles.modalCloseIcon} />
            </Pressable>
            <Pressable onPress={() => setShowStorageModal(false)}>
              <Icon name="times" style={styles.modalCloseIcon} />
            </Pressable>
          </View>

          {dbLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#c67ee2" />
              <Text style={styles.emptyText}>Loading...</Text>
            </View>
          ) : savedPhotos.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="camera" style={styles.emptyIcon} />
              <Text style={styles.emptyText}>No saved photos yet</Text>
              <Text style={styles.emptySubtext}>Take a photo — it saves automatically and gets analyzed by AI</Text>
            </View>
          ) : (
            <FlatList
              data={savedPhotos}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.modalList}
              renderItem={({ item }) => (
                <View style={styles.modalPhotoItem}>
                  {/* Thumbnail with pending overlay */}
                  <View style={styles.thumbContainer}>
                    <Image source={{ uri: item.imageUri || item.imageUrl }} style={styles.modalPhotoThumb} />
                    {item.status === 'pending' && (
                      <View style={styles.thumbOverlay}>
                        <ActivityIndicator size="small" color="#c67ee2" />
                      </View>
                    )}
                  </View>

                  {/* Info */}
                  <View style={styles.modalPhotoInfo}>
                    <View style={styles.foodNameRow}>
                      <Text style={styles.modalFoodName} numberOfLines={1}>{item.foodName}</Text>
                      {item.status === 'pending' && (
                        <View style={styles.pendingBadge}><Text style={styles.pendingBadgeText}>analyzing</Text></View>
                      )}
                      {item.status === 'error' && (
                        <View style={[styles.pendingBadge, styles.errorBadge]}><Text style={styles.pendingBadgeText}>failed</Text></View>
                      )}
                    </View>
                    {item.status === 'analyzed' && (
                      <>
                        <View style={styles.modalCaloriesRow}>
                          <Icon name="fire" style={styles.modalCaloriesIcon} />
                          <Text style={styles.modalCalories}>{item.calories} kcal</Text>
                        </View>
                        {item.nutrients ? <Text style={styles.modalNutrients} numberOfLines={1}>{item.nutrients}</Text> : null}
                      </>
                    )}
                    <Text style={styles.modalTimestamp}>{new Date(item.timestamp).toLocaleString()}</Text>
                  </View>

                  {/* Actions */}
                  <View style={styles.itemActions}>
                    {item.status === 'analyzed' && (
                      <Pressable style={styles.modalDetailsBtn} onPress={() => { setSelectedPhoto(item); setShowPhotoDetailsModal(true); }}>
                        <Icon name="eye" style={styles.modalDetailsIcon} />
                      </Pressable>
                    )}
                    <Pressable style={styles.modalDeleteBtn} onPress={() => handleDelete(item)}>
                      <Icon name="trash" style={styles.modalDeleteIcon} />
                    </Pressable>
                  </View>
                </View>
              )}
            />
          )}

          {savedPhotos.length > 0 && (
            <Pressable
              style={styles.clearAllModalBtn}
              onPress={async () => {
                const ids = savedPhotos.map(p => p.id);
                setSavedPhotos([]);
                await supabase.from('food_analyses').delete().in('id', ids);
                setShowStorageModal(false);
              }}
            >
              <Text style={styles.clearAllModalText}>Clear All Photos</Text>
            </Pressable>
          )}
        </View>
      </Modal>

      {/* ── Photo Details Modal ─────────────────────────────────────────── */}
      <Modal visible={showPhotoDetailsModal} animationType="slide" presentationStyle="overFullScreen" onRequestClose={() => setShowPhotoDetailsModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowPhotoDetailsModal(false)} />
        <View style={styles.photoDetailsContainer}>
          <View style={styles.photoDetailsHeader}>
            <Pressable onPress={() => setShowPhotoDetailsModal(false)}>
              <Icon name="times" style={styles.modalCloseIcon} />
            </Pressable>
          </View>
          {selectedPhoto && (
            <>
              <Image source={{ uri: selectedPhoto.imageUri || selectedPhoto.imageUrl }} style={styles.photoDetailsImage} />
              <View style={styles.photoDetailsContent}>
                <Text style={styles.photoDetailsTitle}>{selectedPhoto.foodName}</Text>
                <View style={styles.photoDetailsCaloriesRow}>
                  <Icon name="fire" style={styles.photoDetailsCaloriesIcon} />
                  <Text style={styles.photoDetailsCalories}>{selectedPhoto.calories} kcal</Text>
                </View>
                {selectedPhoto.nutrients ? <Text style={styles.detailsNutrients}>{selectedPhoto.nutrients}</Text> : null}
                <Text style={styles.photoDetailsBenefitsLabel}>Benefits:</Text>
                <ScrollView style={styles.photoDetailsBenefitsScroll}>
                  <Text style={styles.photoDetailsBenefitsText}>{selectedPhoto.benefits}</Text>
                </ScrollView>
                <Text style={styles.photoDetailsTimestamp}>{new Date(selectedPhoto.timestamp).toLocaleString()}</Text>
              </View>
              <Pressable style={styles.backToStorageBtn} onPress={() => { setShowPhotoDetailsModal(false); setSelectedPhoto(null); }}>
                <Text style={styles.backToStorageText}>Back to Storage</Text>
              </Pressable>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#15041f' },
  message: { color: '#FFFFFF', fontSize: 18 },
  camera: { flex: 1, width: '100%', height: '100%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 50, paddingHorizontal: 20 },
  headerButton: { top: -10, width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  headerIcon: { fontSize: 24, color: '#FFFFFF' },
  instructions: { position: 'absolute', top: 40, left: 125, width: 150, height: 50, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
  instructionText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  photoPreview: { position: 'absolute', top: 120, right: 20, width: 100, height: 100, borderRadius: 10, overflow: 'hidden', borderWidth: 2, borderColor: '#c67ee2' },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  analyzingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  clearPhotoButton: { position: 'absolute', top: 5, right: 5 },
  clearPhotoIcon: { fontSize: 24, color: '#FF4444' },
  resultContainer: { position: 'absolute', top: 120, left: 20, right: 130 },
  resultCard: { backgroundColor: 'rgba(33,28,36,0.96)', borderRadius: 15, padding: 15, borderWidth: 2, borderColor: '#c67ee2' },
  resultTitle: { fontSize: 17, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 6 },
  caloriesRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  caloriesIcon: { fontSize: 16, color: '#F3AF41', marginRight: 6 },
  caloriesText: { fontSize: 20, fontWeight: 'bold', color: '#F3AF41' },
  nutrientsText: { fontSize: 11, color: '#84d7f4', marginBottom: 6 },
  benefitsLabel: { fontSize: 12, fontWeight: 'bold', color: '#c67ee2', marginBottom: 3 },
  benefitsScroll: { maxHeight: 70 },
  benefitsText: { fontSize: 11, color: '#CCCCCC', lineHeight: 16 },
  savedBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(198,126,226,0.2)' },
  savedBadgeText: { fontSize: 10, color: '#4CAF50' },
  loadingContainer: { position: 'absolute', top: '40%', left: 20, right: 20, backgroundColor: 'rgba(33,28,36,0.96)', borderRadius: 20, padding: 30, alignItems: 'center', borderWidth: 2, borderColor: '#c67ee2' },
  loadingText: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginTop: 15 },
  loadingSubtext: { fontSize: 14, color: '#CCCCCC', marginTop: 5 },
  captureButton: { position: 'absolute', bottom: 100, left: 160, width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#1e1929' },
  captureButtonDisabled: { opacity: 0.4 },
  captureButtonInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#1e1929' },
  controls: { position: 'absolute', bottom: 60, width: '100%', flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 30, alignItems: 'center' },
  viewSavedBtn: { height: 50, backgroundColor: '#1e1929', borderRadius: 25, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 18, gap: 8, borderWidth: 1, borderColor: '#fcb92a' },
  viewSavedIcon: { fontSize: 18, color: '#fcb92a' },
  viewSavedText: { fontSize: 15, fontWeight: 'bold', color: '#FFFFFF' },
  permissionContainer: { alignItems: 'center', padding: 30, flex: 1, justifyContent: 'center' },
  permissionIcon: { fontSize: 60, color: '#c67ee2', marginBottom: 20 },
  permissionTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 15, textAlign: 'center' },
  permissionText: { fontSize: 16, color: '#CCCCCC', textAlign: 'center', marginBottom: 30, lineHeight: 24 },
  permissionButton: { backgroundColor: '#c67ee2', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 25, marginBottom: 15 },
  permissionButtonText: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  closePermissionButton: { paddingHorizontal: 30, paddingVertical: 15 },
  closePermissionButtonText: { fontSize: 16, color: '#CCCCCC' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  modalContainer: { position: 'absolute', bottom: 0, width: '100%', height: '100%', backgroundColor: '#1e1e1f' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingVertical: 20, borderBottomWidth: 3, borderBottomColor: '#4d4d4d', marginBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', flex: 1 },
  modalCloseIcon: { fontSize: 24, color: '#CCCCCC' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyIcon: { fontSize: 60, color: '#666666' },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#CCCCCC' },
  emptySubtext: { fontSize: 14, color: '#999999', textAlign: 'center', lineHeight: 20, paddingHorizontal: 40 },
  modalList: { paddingHorizontal: 20, paddingBottom: 20 },
  modalPhotoItem: { flexDirection: 'row', backgroundColor: '#2a2a2a', borderRadius: 16, marginBottom: 12, alignItems: 'center', overflow: 'hidden' },
  thumbContainer: { width: 75, height: 75 },
  modalPhotoThumb: { width: 75, height: 75, resizeMode: 'cover' },
  thumbOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  modalPhotoInfo: { flex: 1, padding: 12, gap: 3 },
  foodNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalFoodName: { fontSize: 15, fontWeight: 'bold', color: '#FFFFFF', flex: 1 },
  pendingBadge: { backgroundColor: 'rgba(198,126,226,0.25)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  errorBadge: { backgroundColor: 'rgba(255,68,68,0.25)' },
  pendingBadgeText: { fontSize: 10, color: '#c67ee2', fontWeight: '700' },
  modalCaloriesRow: { flexDirection: 'row', alignItems: 'center' },
  modalCaloriesIcon: { fontSize: 14, color: '#F3AF41', marginRight: 5 },
  modalCalories: { fontSize: 14, fontWeight: 'bold', color: '#F3AF41' },
  modalNutrients: { fontSize: 11, color: '#84d7f4' },
  modalTimestamp: { fontSize: 11, color: '#999999' },
  itemActions: { flexDirection: 'column', gap: 6, paddingRight: 12 },
  modalDeleteBtn: { padding: 8, borderRadius: 10, backgroundColor: 'rgba(255,68,68,0.2)', borderWidth: 1, borderColor: 'rgba(255,68,68,0.4)' },
  modalDeleteIcon: { fontSize: 18, color: '#FF4444' },
  modalDetailsBtn: { padding: 8, borderRadius: 10, backgroundColor: 'rgba(76,175,80,0.2)', borderWidth: 1, borderColor: 'rgba(76,175,80,0.4)' },
  modalDetailsIcon: { fontSize: 18, color: '#4CAF50' },
  clearAllModalBtn: { backgroundColor: 'rgba(255,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(255,68,68,0.4)', paddingVertical: 16, marginHorizontal: 20, marginBottom: 20, borderRadius: 12, alignItems: 'center' },
  clearAllModalText: { fontSize: 16, fontWeight: '600', color: '#FF4444' },
  photoDetailsContainer: { position: 'absolute', bottom: 0, width: '100%', height: '100%', backgroundColor: '#1e1e1f' },
  photoDetailsHeader: { paddingHorizontal: 25, paddingVertical: 20, flexDirection: 'row', justifyContent: 'flex-end' },
  photoDetailsImage: { width: '100%', height: 280, resizeMode: 'cover' },
  photoDetailsContent: { padding: 25, flex: 1 },
  photoDetailsTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 12 },
  photoDetailsCaloriesRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  photoDetailsCaloriesIcon: { fontSize: 24, color: '#F3AF41', marginRight: 10 },
  photoDetailsCalories: { fontSize: 24, fontWeight: 'bold', color: '#F3AF41' },
  detailsNutrients: { fontSize: 13, color: '#84d7f4', marginBottom: 12 },
  photoDetailsBenefitsLabel: { fontSize: 16, fontWeight: 'bold', color: '#c67ee2', marginBottom: 8 },
  photoDetailsBenefitsScroll: { maxHeight: 180, marginBottom: 15 },
  photoDetailsBenefitsText: { fontSize: 15, color: '#CCCCCC', lineHeight: 22 },
  photoDetailsTimestamp: { fontSize: 13, color: '#999999', textAlign: 'center' },
  backToStorageBtn: { backgroundColor: 'rgba(198,126,226,0.2)', borderTopWidth: 1, borderTopColor: 'rgba(198,126,226,0.4)', paddingVertical: 20, alignItems: 'center' },
  backToStorageText: { fontSize: 16, fontWeight: '600', color: '#c67ee2' },
});