export enum MealTime {
  BREAKFAST = 'Breakfast',
  LUNCH = 'Lunch',
  SNACK = 'Snack',
  DINNER = 'Dinner'
}

export interface FoodItem {
  id: string;
  name: string; // e.g., "1 Roti", "Dal (1 katori)"
  calories: number;
  carbs: number; // in grams
  protein: number; // in grams
  fat: number; // in grams
}

export interface LoggedMeal {
  id: string;
  name: string;
  calories: number;
  carbs: number;
  time: MealTime;
  timestamp: number;
}

export interface Workout {
  id: string;
  type: string;
  durationMinutes: number;
  caloriesBurned: number;
  timestamp: number;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  waterGlasses: number;
  meals: LoggedMeal[];
  workouts: Workout[];
  totalCaloriesIn: number;
  totalCarbs: number;
  totalCaloriesBurned: number;
  aiInsight?: string;
}

export interface UserMetadata {
  onboardingCompleted: boolean;
  age: number;
  gender: 'male' | 'female';
  height: number; // cm
  weight: number; // kg
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active';
  bmi: number;
  bmr: number;
  targetCalories: number;
  targetWater: number; // glasses
  customFoods: FoodItem[]; // Cache for AI analyzed foods
  // Storing logs directly in metadata for this app architecture
  // Keys are YYYY-MM-DD string
  logs: Record<string, DailyLog>;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  targetCalories: number;
  targetWater: number;
}