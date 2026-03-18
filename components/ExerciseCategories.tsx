interface Category {
  id: string;
  name: string;
  icon: string;
}

export const EXERCISE_CATEGORIES: Category[] = [
  { id: 'cardio', name: 'Cardio', icon: 'heart' },
  { id: 'strength', name: 'Strength', icon: 'dumbbell' },
  { id: 'flexibility', name: 'Flexibility', icon: 'running' },
  { id: 'balance', name: 'Balance', icon: 'balance-scale' },
];

