import { FoodItem, MealTime } from "./types";

// Common Indian Food Items for Quick Add
export const INDIAN_FOOD_DATABASE: FoodItem[] = [
  { id: 'f1', name: 'Roti (Whole Wheat)', calories: 100, carbs: 15, protein: 3, fat: 0.5 },
  { id: 'f2', name: 'Dal (1 Katori)', calories: 150, carbs: 18, protein: 6, fat: 4 },
  { id: 'f3', name: 'Rice (White, 1 Bowl)', calories: 200, carbs: 45, protein: 4, fat: 0.5 },
  { id: 'f4', name: 'Rice (Brown, 1 Bowl)', calories: 180, carbs: 40, protein: 5, fat: 1.5 },
  { id: 'f5', name: 'Sabzi (Mixed Veg)', calories: 120, carbs: 10, protein: 2, fat: 7 },
  { id: 'f6', name: 'Paneer Curry (1 Bowl)', calories: 250, carbs: 8, protein: 12, fat: 18 },
  { id: 'f7', name: 'Dosa (Plain)', calories: 130, carbs: 25, protein: 3, fat: 2 },
  { id: 'f8', name: 'Idli (2 pcs)', calories: 120, carbs: 24, protein: 4, fat: 0.5 },
  { id: 'f9', name: 'Chai (with sugar)', calories: 100, carbs: 12, protein: 1, fat: 3 },
  { id: 'f10', name: 'Chai (no sugar)', calories: 30, carbs: 2, protein: 1, fat: 2 },
  { id: 'f11', name: 'Fruits (Apple/Guava)', calories: 60, carbs: 14, protein: 0.5, fat: 0.2 },
  { id: 'f12', name: 'Biscuits (Marie, 2)', calories: 50, carbs: 8, protein: 1, fat: 1.5 },
  { id: 'f13', name: 'Upma (1 Bowl)', calories: 200, carbs: 30, protein: 5, fat: 7 },
  { id: 'f14', name: 'Poha (1 Bowl)', calories: 250, carbs: 40, protein: 3, fat: 8 },
];

export const MEAL_TYPES = [
  MealTime.BREAKFAST,
  MealTime.LUNCH,
  MealTime.SNACK,
  MealTime.DINNER
];

// Default Targets (Fallbacks if onboarding not done)
export const DEFAULT_CALORIE_TARGET = 1800;
export const DEFAULT_WATER_TARGET = 8; // glasses

// Clerk Configuration
// 1. Go to https://dashboard.clerk.com
// 2. Create an application
// 3. Copy the 'Publishable Key' and paste it below or in your .env file
export const VITE_CLERK_PUBLISHABLE_KEY =
  (import.meta as any).env.VITE_CLERK_PUBLISHABLE_KEY ||
  "pk_test_bG9naWNhbC1jaG93LTcxLmNsZXJrLmFjY291bnRzLmRldiQ";
