import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = '@exercise_favorites';

export const saveFavorites = async (favorites: string[]) => {
  try {
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    console.log('Local favorites saved:', favorites);
  } catch (error) {
    console.error('Save favorites error:', error);
  }
};

export const loadFavorites = async (): Promise<string[]> => {
  try {
    const stored = await AsyncStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Load favorites error:', error);
    return [];
  }
};

export const toggleFavoriteLocal = async (exerciseId: string, favorites: Set<string>): Promise<Set<string>> => {
  const newFavorites = new Set(favorites);
  if (newFavorites.has(exerciseId)) {
    newFavorites.delete(exerciseId);
  } else {
    newFavorites.add(exerciseId);
  }
  await saveFavorites(Array.from(newFavorites));
  return newFavorites;
};
