interface Category {
  id: string;
  name: string;
  icon: string;
}

export const EXERCISE_CATEGORIES: Category[] = [
  { id: 'all', name: 'All', icon: 'th' },
  { id: 'cardio', name: 'Cardio', icon: 'heart-pulse' },
  { id: 'strength', name: 'Strength', icon: 'dumbbell' },
  { id: 'flexibility', name: 'Flexibility', icon: 'person-running' },
  { id: 'balance', name: 'Balance', icon: 'balance-scale' },
];

