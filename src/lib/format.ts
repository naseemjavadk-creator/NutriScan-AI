import { NUTRIENT_BY_KEY, type NutrientKey } from "./nutrients";

export function formatNutrient(key: NutrientKey, value: number | null, withUnit = true): string {
  if (value === null) return "Not available";
  const meta = NUTRIENT_BY_KEY[key];
  const text = value.toLocaleString(undefined, { maximumFractionDigits: meta.decimals });
  return withUnit ? `${text} ${meta.unit}` : text;
}

export function pct(value: number, goal: number): number {
  if (!goal) return 0;
  return Math.max(0, Math.round((value / goal) * 100));
}

export function guessMealType(date = new Date()): "breakfast" | "lunch" | "dinner" | "snack" {
  const h = date.getHours();
  if (h >= 5 && h < 11) return "breakfast";
  if (h >= 11 && h < 16) return "lunch";
  if (h >= 17 && h < 22) return "dinner";
  return "snack";
}
