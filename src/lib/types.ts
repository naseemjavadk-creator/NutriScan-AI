import type { Nutrients, NutrientKey } from "./nutrients";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

/** One food the vision model thinks it sees. Values are ESTIMATES. */
export interface DetectedItem {
  id: string;
  name: string;
  /** Generic database-friendly description used to search USDA, e.g. "rice, white, cooked". */
  searchQuery: string;
  grams: number;
  /** 0..1, the model's self-reported confidence. Not a calibrated probability. */
  confidence: number;
  note?: string;
}

export interface AnalysisResult {
  isFood: boolean;
  imageQuality: "clear" | "unclear";
  items: DetectedItem[];
  /** Follow-up questions where the answer would significantly change the result. */
  questions: string[];
}

export interface FoodMatch {
  fdcId: number;
  description: string;
  dataType: string;
}

export interface ItemNutrition {
  id: string;
  name: string;
  grams: number;
  /** null = no database match was found; all nutrients are then "Not available". */
  match: FoodMatch | null;
  /** Values for the portion in `grams` (database value per 100 g x grams/100). */
  nutrients: Nutrients;
}

export interface NutritionReportData {
  items: ItemNutrition[];
  totals: Nutrients;
  partial: NutrientKey[];
}

export interface Meal {
  id: string;
  name: string;
  meal_type: MealType;
  eaten_at: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  items: ItemNutrition[];
  totals: Nutrients;
}

export interface Profile {
  display_name: string | null;
  calorie_goal: number;
  protein_goal: number;
  carbs_goal: number;
  fat_goal: number;
}

export const DEFAULT_PROFILE: Profile = {
  display_name: null,
  calorie_goal: 2000,
  protein_goal: 100,
  carbs_goal: 250,
  fat_goal: 70,
};
