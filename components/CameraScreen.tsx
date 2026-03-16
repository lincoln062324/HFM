import React, { useState, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StyleSheet, Text, View, Pressable, Alert, Image, ActivityIndicator, ScrollView, FlatList, Modal } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import Icon from 'react-native-vector-icons/FontAwesome';

// Food Entry interface for storage
export interface FoodEntry {
  id: string;
  imageUri: string;
  foodName: string;
  calories: number;
  benefits: string;
  timestamp: string;
}

interface CameraScreenProps {
  onClose: () => void;
  onFoodAnalyzed?: (food: FoodEntry) => void;
}

// Mock AI Food Analysis API - Simulates food scanning
const analyzeFoodWithAI = async (imageUri: string): Promise<{ foodName: string; calories: number; benefits: string }> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Mock response - in production, this would call a real AI API
  const foodOptions = [
    { foodName: 'Grilled Chicken Salad', calories: 350, benefits: 'High protein, low carbs, rich in vitamins A and C, supports muscle growth and immune system.' },
    { foodName: 'Pasta Carbonara', calories: 550, benefits: 'Good source of carbohydrates for energy, protein from eggs and cheese, satisfying and filling.' },
    { foodName: 'Vegetable Stir Fry', calories: 220, benefits: 'Low calorie, high fiber, packed with antioxidants, promotes digestive health and reduces disease risk.' },
    { foodName: 'Grilled Salmon', calories: 400, benefits: 'Excellent source of omega-3 fatty acids, high quality protein, supports heart and brain health.' },
    { foodName: 'Fruit Smoothie Bowl', calories: 280, benefits: 'Rich in vitamins and antioxidants, natural sugars for energy, supports immune system and skin health.' },
    { foodName: 'Quinoa Buddha Bowl', calories: 420, benefits: 'Complete protein source, high in fiber, contains iron and magnesium for energy metabolism.' },
    { foodName: 'Avocado Toast', calories: 320, benefits: 'Healthy fats for heart health, fiber-rich, provides sustained energy and supports brain function.' },
    { foodName: 'Greek Yogurt Parfait', calories: 250, benefits: 'Probiotics for gut health, high protein for satiety, calcium for bone health.' },
  ];
  
  // Randomly select a food for demo purposes
  const randomIndex = Math.floor(Math.random() * foodOptions.length);
  return foodOptions[randomIndex];
};

export default function CameraScreen({ onClose, onFoodAnalyzed }: CameraScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [isTakingPicture, setIsTakingPicture] = useState(false);
  const [lastPhoto, setLastPhoto] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ foodName: string; calories: number; benefits: string } | null>(null);
  const [savedPhotos, setSavedPhotos] = useState<FoodEntry[]>([]);
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<FoodEntry | null>(null);
  const [showPhotoDetailsModal, setShowPhotoDetailsModal] = useState(false);

  const PHOTO_STORAGE_KEY = 'camera_saved_photos';

  // Load saved photos from storage
  const loadSavedPhotos = async () => {
    try {
      const stored = await AsyncStorage.getItem(PHOTO_STORAGE_KEY);
      if (stored) {
        setSavedPhotos(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load saved photos:', error);
    }
  };

  // Save photo to storage and update state
  const savePhoto = async (foodEntry: FoodEntry) => {
    try {
      const updated = [foodEntry, ...savedPhotos];
      await AsyncStorage.setItem(PHOTO_STORAGE_KEY, JSON.stringify(updated));
      setSavedPhotos(updated);
    } catch (error) {
      console.error('Failed to save photo:', error);
      Alert.alert('Error', 'Failed to save photo to storage.');
    }
  };

  useEffect(() => {
    loadSavedPhotos();
  }, []);
  const cameraRef = useRef<CameraView>(null);

  const toggleFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const handleAnalyzeFood = async () => {
    if (!lastPhoto) return;
    
    try {
      setIsAnalyzing(true);
      const result = await analyzeFoodWithAI(lastPhoto);
      setAnalysisResult(result);
      
      // Create food entry
      const foodEntry: FoodEntry = {
        id: Date.now().toString(),
        imageUri: lastPhoto,
        foodName: result.foodName,
        calories: result.calories,
        benefits: result.benefits,
        timestamp: new Date().toISOString(),
      };
      
      // Auto-save to local storage container
      await savePhoto(foodEntry);

      // Pass to parent if callback provided
      if (onFoodAnalyzed) {
        onFoodAnalyzed(foodEntry);
      }
      
      Alert.alert(
        'Analysis Complete',
        `Detected: ${result.foodName}\nCalories: ${result.calories}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to analyze food. Please try again.');
      console.error('Food analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const takePicture = async () => {
    if (cameraRef.current && !isTakingPicture) {
      try {
        setIsTakingPicture(true);
        setAnalysisResult(null); // Reset previous analysis
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          skipProcessing: false,
        });
        
        if (photo?.uri) {
          setLastPhoto(photo.uri);
          Alert.alert('Photo Captured', 'Photo taken successfully! Tap "Analyze Food" to scan calories and benefits.');
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to take picture. Please try again.');
        console.error('Take picture error:', error);
      } finally {
        setIsTakingPicture(false);
      }
    }
  };

  // If permissions are not granted yet
  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Requesting camera permission...</Text>
      </View>
    );
  }

  // If camera permission is denied
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Icon name="camera" style={styles.permissionIcon} />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need camera access to take photos of your meals and fitness activities.
          </Text>
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

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        mode="picture"
      >
        {/* Header with close and flip buttons */}
        <View style={styles.header}>
          <Pressable style={styles.headerButton} onPress={onClose}>
            <Icon name="times" style={styles.headerIcon} />
          </Pressable>
          <Pressable style={styles.headerButton} onPress={toggleFacing}>
            <Icon name="refresh" style={styles.headerIcon} />
          </Pressable>
        </View>

        {/* Last photo preview */}
        {lastPhoto && (
          <View style={styles.photoPreview}>
            <Image source={{ uri: lastPhoto }} style={styles.previewImage} />
            <Pressable 
              style={styles.clearPhotoButton} 
              onPress={() => {
                setLastPhoto(null);
                setAnalysisResult(null);
              }}
            >
              <Icon name="times-circle" style={styles.clearPhotoIcon} />
            </Pressable>
          </View>
        )}

        {/* Analysis Result Display */}
        {analysisResult && (
          <View style={styles.resultContainer}>
            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>{analysisResult.foodName}</Text>
              <View style={styles.caloriesRow}>
                <Icon name="fire" style={styles.caloriesIcon} />
                <Text style={styles.caloriesText}>{analysisResult.calories} kcal</Text>
              </View>
              <Text style={styles.benefitsLabel}>Benefits:</Text>
              <ScrollView style={styles.benefitsScroll}>
                <Text style={styles.benefitsText}>{analysisResult.benefits}</Text>
              </ScrollView>
            </View>
          </View>
        )}

        {/* Loading Indicator */}
        {isAnalyzing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#c67ee2" />
            <Text style={styles.loadingText}>Analyzing food...</Text>
            <Text style={styles.loadingSubtext}>AI is scanning your meal</Text>
          </View>
        )}

        {/* Camera controls */}
        <Pressable 
            style={[styles.captureButton, isTakingPicture && styles.captureButtonDisabled]} 
            onPress={takePicture}
            disabled={isTakingPicture || isAnalyzing}
          >
            <View style={styles.captureButtonInner} />
          </Pressable>
        <View style={styles.controls}>
          
          {/* Analyze Food Button */}
          <Pressable 
            style={[styles.analyzeButton, (!lastPhoto || isAnalyzing) && styles.analyzeButtonDisabled]} 
            onPress={handleAnalyzeFood}
            disabled={!lastPhoto || isAnalyzing}
          >
            <Icon name="search" style={styles.analyzeIcon} />
            <Text style={styles.analyzeText}>Analyze</Text>
          </Pressable>

          
        {/* View Saved Button */}
        {savedPhotos.length > 0 && (
          <Pressable 
            style={styles.viewSavedBtn}
            onPress={() => setShowStorageModal(true)}
          >
            <Icon name="folder-open" style={styles.viewSavedIcon} />
            <Text style={styles.viewSavedText}>Saved ({savedPhotos.length})</Text>
          </Pressable>
        )}
      </View>
        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            {facing === 'back' ? 'Point at your meal' : 'Take a selfie!'}
          </Text>
        </View>

      </CameraView>

      {/* Storage Modal */}
      <Modal
        visible={showStorageModal}
        animationType="slide"
        presentationStyle="overFullScreen"
        onRequestClose={() => setShowStorageModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowStorageModal(false)} />
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Saved Photos ({savedPhotos.length})</Text>
            <Pressable onPress={() => setShowStorageModal(false)}>
              <Icon name="times" style={styles.modalCloseIcon} />
            </Pressable>
          </View>
          {savedPhotos.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="camera" style={styles.emptyIcon} />
              <Text style={styles.emptyText}>No saved photos yet</Text>
              <Text style={styles.emptySubtext}>Take & analyze photos to save them here</Text>
            </View>
          ) : (
            <FlatList
              data={savedPhotos}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.modalList}
              renderItem={({ item }) => (
                <View style={styles.modalPhotoItem}>
                  <Image source={{ uri: item.imageUri }} style={styles.modalPhotoThumb} />
                  <View style={styles.modalPhotoInfo}>
                    <Text style={styles.modalFoodName}>{item.foodName}</Text>
                    <View style={styles.modalCaloriesRow}>
                      <Icon name="fire" style={styles.modalCaloriesIcon} />
                      <Text style={styles.modalCalories}>{item.calories} kcal</Text>
                    </View>
                    <Text style={styles.modalTimestamp}>{new Date(item.timestamp).toLocaleString()}</Text>
                  </View>
                  <Pressable 
                    style={styles.modalDeleteBtn}
                    onPress={async () => {
                      const updated = savedPhotos.filter(p => p.id !== item.id);
                      setSavedPhotos(updated);
                      await AsyncStorage.setItem(PHOTO_STORAGE_KEY, JSON.stringify(updated));
                    }}
                  >
                    <Icon name="trash" style={styles.modalDeleteIcon} />
                  </Pressable>
                  <Pressable 
                    style={styles.modalDetailsBtn}
                    onPress={() => {
                      setSelectedPhoto(item);
                      setShowPhotoDetailsModal(true);
                    }}
                  >
                    <Icon name="eye" style={styles.modalDetailsIcon} />
                  </Pressable>
                </View>
              )}
            />
          )}
          {savedPhotos.length > 0 && (
            <Pressable 
              style={styles.clearAllModalBtn}
              onPress={async () => {
                setSavedPhotos([]);
                await AsyncStorage.removeItem(PHOTO_STORAGE_KEY);
                setShowStorageModal(false);
              }}
            >
              <Text style={styles.clearAllModalText}>Clear All Photos</Text>
            </Pressable>
          )}
        </View>
      </Modal>

      {/* Photo Details Modal */}
      <Modal
        visible={showPhotoDetailsModal}
        animationType="slide"
        presentationStyle="overFullScreen"
        onRequestClose={() => setShowPhotoDetailsModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowPhotoDetailsModal(false)} />
        <View style={styles.photoDetailsContainer}>
          <View style={styles.photoDetailsHeader}>
            <Pressable onPress={() => setShowPhotoDetailsModal(false)}>
              <Icon name="times" style={styles.modalCloseIcon} />
            </Pressable>
          </View>
          {selectedPhoto && (
            <>
              <Image source={{ uri: selectedPhoto.imageUri }} style={styles.photoDetailsImage} />
              <View style={styles.photoDetailsContent}>
                <Text style={styles.photoDetailsTitle}>{selectedPhoto.foodName}</Text>
                <View style={styles.photoDetailsCaloriesRow}>
                  <Icon name="fire" style={styles.photoDetailsCaloriesIcon} />
                  <Text style={styles.photoDetailsCalories}>{selectedPhoto.calories} kcal</Text>
                </View>
                <Text style={styles.photoDetailsBenefitsLabel}>Benefits:</Text>
                <ScrollView style={styles.photoDetailsBenefitsScroll}>
                  <Text style={styles.photoDetailsBenefitsText}>{selectedPhoto.benefits}</Text>
                </ScrollView>
                <Text style={styles.photoDetailsTimestamp}>
                  {new Date(selectedPhoto.timestamp).toLocaleString()}
                </Text>
              </View>
              <Pressable 
                style={styles.backToStorageBtn}
                onPress={() => {
                  setShowPhotoDetailsModal(false);
                  setSelectedPhoto(null);
                }}
              >
                <Text style={styles.backToStorageText}>← Back to Storage</Text>
              </Pressable>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#15041f',
  },

  message: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  camera: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  headerButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  controls: {
    position: 'absolute',
    bottom: 60,
    width: "100%",
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  captureButton: {
    position:'absolute',
    bottom: 100,
    left: 160,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#1e1929',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1e1929',
  },
  analyzeButton: {
    position: 'relative',
    width: 120,
    height: 50,
    left: -25,
    backgroundColor: '#1e1929',
    borderRadius: 25,
    flexDirection:'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzeButtonDisabled: {
    opacity: 0.5,
  },
  analyzeIcon: {
    fontSize: 20,
    color: '#2ea1ff',
    marginRight: 8,
  },
  analyzeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  instructions: {
    position: 'absolute',
    top: 50,
    left: 125,
    width: 150, 
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  permissionContainer: {
    alignItems: 'center',
    padding: 30,
  },
  permissionIcon: {
    fontSize: 60,
    color: '#c67ee2',
    marginBottom: 20,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#c67ee2',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 15,
  },
  permissionButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closePermissionButton: {
    paddingHorizontal: 30,
    paddingVertical: 15,
  },
  closePermissionButtonText: {
    fontSize: 16,
    color: '#CCCCCC',
  },
  photoPreview: {
    position: 'absolute',
    top: 120,
    right: 20,
    width: 100,
    height: 100,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#c67ee2',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  clearPhotoButton: {
    position: 'absolute',
    top: 5,
    right: 5,
  },
  clearPhotoIcon: {
    fontSize: 24,
    color: '#FF4444',
  },
  resultContainer: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 130,
  },
  resultCard: {
    backgroundColor: 'rgba(33, 28, 36, 0.95)',
    borderRadius: 15,
    padding: 15,
    borderWidth: 2,
    borderColor: '#c67ee2',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  caloriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  caloriesIcon: {
    fontSize: 18,
    color: '#F3AF41',
    marginRight: 8,
  },
  caloriesText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F3AF41',
  },
  benefitsLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#c67ee2',
    marginBottom: 4,
  },
  benefitsScroll: {
    maxHeight: 80,
  },
  benefitsText: {
    fontSize: 12,
    color: '#CCCCCC',
    lineHeight: 18,
  },
  loadingContainer: {
    position: 'absolute',
    top: '40%',
    left: 20,
    right: 20,
    backgroundColor: 'rgba(33, 28, 36, 0.95)',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#c67ee2',
  },
  loadingText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 15,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#CCCCCC',
    marginTop: 5,
  },

  // View Saved Button Styles
  viewSavedBtn: {
    position: 'relative',
    width: 120,
    height: 50,
    right: -25,
    backgroundColor: '#1e1929',
    borderRadius: 25,
    flexDirection:'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  viewSavedIcon: {
    fontSize: 20,
    color: '#fcb92a',
    marginRight: 8,
    marginLeft: 5,
  },
  viewSavedText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },

  // Modal Overlay and Container
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    width: "100%",
    height: "100%",
    backgroundColor: '#1e1e1f',
  },

  // Modal Header
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 20,
    borderBottomWidth: 3,
    borderBottomColor: '#4d4d4d',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  modalCloseIcon: {
    fontSize: 24,
    color: '#CCCCCC',
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 60,
    color: '#666666',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#CCCCCC',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Modal List and Photo Items
  modalList: {
    flexGrow: 0,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalPhotoItem: {
    flexDirection: 'row',
    backgroundColor: '#3b3b3b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  modalPhotoThumb: {
    width: 70,
    height: 70,
    borderRadius: 12,
    marginRight: 16,
    backgroundColor: '#333',
  },
  modalPhotoInfo: {
    flex: 1,
  },
  modalFoodName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  modalCaloriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalCaloriesIcon: {
    fontSize: 16,
    color: '#F3AF41',
    marginRight: 8,
  },
  modalCalories: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F3AF41',
  },
  modalTimestamp: {
    fontSize: 12,
    color: '#999999',
  },

  // Delete Button
  modalDeleteBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.4)',
  },
  modalDeleteIcon: {
    fontSize: 20,
    color: '#FF4444',
  },

  // View Details Button
  modalDetailsBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.4)',
    marginLeft: 8,
  },
  modalDetailsIcon: {
    fontSize: 20,
    color: '#4CAF50',
  },

  // Photo Details Modal Styles
  photoDetailsContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#1e1e1f',
  },
  photoDetailsHeader: {
    paddingHorizontal: 25,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  photoDetailsImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  photoDetailsContent: {
    padding: 25,
    flex: 1,
  },
  photoDetailsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  photoDetailsCaloriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  photoDetailsCaloriesIcon: {
    fontSize: 24,
    color: '#F3AF41',
    marginRight: 12,
  },
  photoDetailsCalories: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F3AF41',
  },
  photoDetailsBenefitsLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#c67ee2',
    marginBottom: 10,
  },
  photoDetailsBenefitsScroll: {
    maxHeight: 200,
    marginBottom: 20,
  },
  photoDetailsBenefitsText: {
    fontSize: 16,
    color: '#CCCCCC',
    lineHeight: 22,
  },
  photoDetailsTimestamp: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
  },
  backToStorageBtn: {
    backgroundColor: 'rgba(198, 126, 226, 0.2)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(198, 126, 226, 0.4)',
    paddingVertical: 20,
    alignItems: 'center',
  },
  backToStorageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#c67ee2',
  },

  // Clear All Button
  clearAllModalBtn: {
    backgroundColor: 'rgba(255, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.4)',
    paddingVertical: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  clearAllModalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF4444',
  },
});


