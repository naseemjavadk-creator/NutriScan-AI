/**
 * Single source of truth for every nutrient the app shows.
 * `usdaIds` are USDA FoodData Central nutrient IDs, tried in order.
 * `dv` is a general adult daily reference (FDA Daily Values) used only for progress bars.
 */
export type NutrientKey =
  | "calories" | "protein" | "carbs" | "fat" | "saturatedFat" | "fiber" | "sugar" | "sodium"
  | "vitaminA" | "thiamin" | "riboflavin" | "niacin" | "vitaminB6" | "vitaminB12"
  | "vitaminC" | "vitaminD" | "vitaminE" | "vitaminK"
  | "calcium" | "iron" | "potassium" | "magnesium" | "zinc" | "folate";

/** null means "Not available" in the source data. It is never replaced by 0. */
export type Nutrients = Record<NutrientKey, number | null>;

export interface NutrientMeta {
  key: NutrientKey;
  label: string;
  unit: string;
  group: "main" | "vitamin" | "mineral";
  decimals: number;
  usdaIds: number[];
  dv?: number;
}

export const NUTRIENTS: NutrientMeta[] = [
  { key: "calories", label: "Calories", unit: "kcal", group: "main", decimals: 0, usdaIds: [1008, 2047, 2048] },
  { key: "protein", label: "Protein", unit: "g", group: "main", decimals: 1, usdaIds: [1003], dv: 50 },
  { key: "carbs", label: "Carbohydrates", unit: "g", group: "main", decimals: 1, usdaIds: [1005], dv: 275 },
  { key: "fat", label: "Total fat", unit: "g", group: "main", decimals: 1, usdaIds: [1004], dv: 78 },
  { key: "saturatedFat", label: "Saturated fat", unit: "g", group: "main", decimals: 1, usdaIds: [1258], dv: 20 },
  { key: "fiber", label: "Dietary fiber", unit: "g", group: "main", decimals: 1, usdaIds: [1079], dv: 28 },
  { key: "sugar", label: "Sugar", unit: "g", group: "main", decimals: 1, usdaIds: [2000, 1063] },
  { key: "sodium", label: "Sodium", unit: "mg", group: "main", decimals: 0, usdaIds: [1093], dv: 2300 },

  { key: "vitaminA", label: "Vitamin A", unit: "µg RAE", group: "vitamin", decimals: 0, usdaIds: [1106], dv: 900 },
  { key: "thiamin", label: "Vitamin B1 (thiamin)", unit: "mg", group: "vitamin", decimals: 2, usdaIds: [1165], dv: 1.2 },
  { key: "riboflavin", label: "Vitamin B2 (riboflavin)", unit: "mg", group: "vitamin", decimals: 2, usdaIds: [1166], dv: 1.3 },
  { key: "niacin", label: "Vitamin B3 (niacin)", unit: "mg", group: "vitamin", decimals: 1, usdaIds: [1167], dv: 16 },
  { key: "vitaminB6", label: "Vitamin B6", unit: "mg", group: "vitamin", decimals: 2, usdaIds: [1175], dv: 1.7 },
  { key: "vitaminB12", label: "Vitamin B12", unit: "µg", group: "vitamin", decimals: 2, usdaIds: [1178], dv: 2.4 },
  { key: "vitaminC", label: "Vitamin C", unit: "mg", group: "vitamin", decimals: 1, usdaIds: [1162], dv: 90 },
  { key: "vitaminD", label: "Vitamin D", unit: "µg", group: "vitamin", decimals: 1, usdaIds: [1114], dv: 20 },
  { key: "vitaminE", label: "Vitamin E", unit: "mg", group: "vitamin", decimals: 1, usdaIds: [1109], dv: 15 },
  { key: "vitaminK", label: "Vitamin K", unit: "µg", group: "vitamin", decimals: 1, usdaIds: [1185], dv: 120 },
  { key: "folate", label: "Folate", unit: "µg DFE", group: "vitamin", decimals: 0, usdaIds: [1190, 1177], dv: 400 },

  { key: "calcium", label: "Calcium", unit: "mg", group: "mineral", decimals: 0, usdaIds: [1087], dv: 1300 },
  { key: "iron", label: "Iron", unit: "mg", group: "mineral", decimals: 1, usdaIds: [1089], dv: 18 },
  { key: "potassium", label: "Potassium", unit: "mg", group: "mineral", decimals: 0, usdaIds: [1092], dv: 4700 },
  { key: "magnesium", label: "Magnesium", unit: "mg", group: "mineral", decimals: 0, usdaIds: [1090], dv: 420 },
  { key: "zinc", label: "Zinc", unit: "mg", group: "mineral", decimals: 1, usdaIds: [1095], dv: 11 },
];

export const NUTRIENT_KEYS: NutrientKey[] = NUTRIENTS.map((n) => n.key);
export const NUTRIENT_BY_KEY = Object.fromEntries(NUTRIENTS.map((n) => [n.key, n])) as Record<NutrientKey, NutrientMeta>;

export function emptyNutrients(): Nutrients {
  return Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, null])) as Nutrients;
}

/** Accepts untrusted JSON and returns a clean Nutrients object (unknown keys dropped, bad values -> null). */
export function normalizeNutrients(input: unknown): Nutrients {
  const out = emptyNutrients();
  if (input && typeof input === "object") {
    for (const key of NUTRIENT_KEYS) {
      const v = (input as Record<string, unknown>)[key];
      out[key] = typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
    }
  }
  return out;
}

const round = (n: number) => Math.round(n * 100) / 100;

export function scaleNutrients(n: Nutrients, factor: number): Nutrients {
  const out = emptyNutrients();
  for (const k of NUTRIENT_KEYS) out[k] = n[k] === null ? null : round(n[k]! * factor);
  return out;
}

export interface Totals {
  nutrients: Nutrients;
  /** Nutrients where at least one (but not every) item had no data, so the total may be an undercount. */
  partial: NutrientKey[];
}

/** Meal total = sum of the individual items. Missing data is never treated as zero. */
export function sumNutrients(list: Nutrients[]): Totals {
  const nutrients = emptyNutrients();
  const partial: NutrientKey[] = [];
  for (const k of NUTRIENT_KEYS) {
    const known = list.filter((n) => n[k] !== null);
    if (known.length === 0) continue;
    nutrients[k] = round(known.reduce((s, n) => s + (n[k] as number), 0));
    if (known.length < list.length) partial.push(k);
  }
  return { nutrients, partial };
}
