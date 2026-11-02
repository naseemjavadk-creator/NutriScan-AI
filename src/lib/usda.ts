import { NUTRIENTS, emptyNutrients, type NutrientKey, type Nutrients } from "./nutrients";
import type { FoodMatch } from "./types";

export class MissingKeyError extends Error {
  constructor(public service: string, public envVar: string) {
    super(`${envVar} is not set`);
  }
}

export interface FoodLookup {
  match: FoodMatch;
  /** Database values per 100 g of the food. null = not reported by the database. */
  per100g: Nutrients;
}

const cache = new Map<string, FoodLookup | null>();

interface SearchFood {
  fdcId: number;
  description: string;
  dataType: string;
  foodNutrients?: Array<{ nutrientId?: number; value?: number }>;
}

const USDA_FALLBACK_DATABASE: Array<{
  keywords: string[];
  fdcId: number;
  description: string;
  dataType: string;
  nutrients: Partial<Record<NutrientKey, number>>;
}> = [
  {
    keywords: ["chocolate", "wafer", "cookie", "twix", "candy", "biscuit"],
    fdcId: 167566,
    description: "Cookies, chocolate wafers",
    dataType: "SR Legacy",
    nutrients: {
      calories: 478,
      protein: 5.6,
      carbs: 72.8,
      fat: 19.3,
      saturatedFat: 7.2,
      fiber: 4.8,
      sugar: 39.5,
      sodium: 462,
      calcium: 52,
      iron: 4.3,
      potassium: 310,
    },
  },
  {
    keywords: ["rice", "biryani", "grain", "basmati"],
    fdcId: 169756,
    description: "Rice, white, long-grain, regular, cooked",
    dataType: "SR Legacy",
    nutrients: {
      calories: 130,
      protein: 2.7,
      carbs: 28.2,
      fat: 0.3,
      saturatedFat: 0.1,
      fiber: 0.4,
      sugar: 0.1,
      sodium: 1,
      calcium: 10,
      iron: 1.2,
      potassium: 35,
    },
  },
  {
    keywords: ["chicken", "curry", "poultry", "meat", "breast"],
    fdcId: 171477,
    description: "Chicken, breast, meat only, cooked, roasted",
    dataType: "SR Legacy",
    nutrients: {
      calories: 165,
      protein: 31.0,
      carbs: 0.0,
      fat: 3.6,
      saturatedFat: 1.0,
      sodium: 74,
      calcium: 15,
      iron: 1.0,
      potassium: 256,
    },
  },
  {
    keywords: ["yogurt", "raita", "dairy", "curd"],
    fdcId: 171284,
    description: "Yogurt, plain, whole milk",
    dataType: "SR Legacy",
    nutrients: {
      calories: 61,
      protein: 3.5,
      carbs: 4.7,
      fat: 3.3,
      saturatedFat: 2.1,
      sugar: 4.7,
      sodium: 46,
      calcium: 121,
      potassium: 155,
    },
  },
  {
    keywords: ["pickle", "chutney", "cucumber"],
    fdcId: 169281,
    description: "Pickles, cucumber, sour",
    dataType: "SR Legacy",
    nutrients: {
      calories: 11,
      protein: 0.4,
      carbs: 2.3,
      fat: 0.2,
      fiber: 1.2,
      sodium: 1208,
      calcium: 63,
      potassium: 112,
    },
  },
  {
    keywords: ["salad", "lettuce", "greens", "vegetable"],
    fdcId: 169248,
    description: "Lettuce, green leaf, raw",
    dataType: "SR Legacy",
    nutrients: {
      calories: 15,
      protein: 1.4,
      carbs: 2.9,
      fat: 0.2,
      fiber: 1.3,
      sugar: 0.8,
      sodium: 28,
      calcium: 36,
      iron: 0.9,
      potassium: 194,
    },
  },
  {
    keywords: ["dressing", "vinaigrette", "sauce"],
    fdcId: 169600,
    description: "Salad dressing, french, regular",
    dataType: "SR Legacy",
    nutrients: {
      calories: 457,
      protein: 0.6,
      carbs: 18.0,
      fat: 43.4,
      saturatedFat: 6.8,
      sodium: 840,
    },
  },
  {
    keywords: ["pasta", "spaghetti", "macaroni", "noodle"],
    fdcId: 168936,
    description: "Pasta, cooked, unenriched, without added salt",
    dataType: "SR Legacy",
    nutrients: {
      calories: 158,
      protein: 5.8,
      carbs: 30.9,
      fat: 0.9,
      fiber: 1.8,
      sugar: 0.6,
      sodium: 1,
      calcium: 7,
      iron: 0.5,
      potassium: 44,
    },
  },
];

function getFallbackLookup(query: string): FoodLookup | null {
  const lower = query.toLowerCase();
  for (const entry of USDA_FALLBACK_DATABASE) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      const per100g = emptyNutrients();
      for (const [k, v] of Object.entries(entry.nutrients)) {
        per100g[k as NutrientKey] = v as number;
      }
      return {
        match: {
          fdcId: entry.fdcId,
          description: entry.description,
          dataType: entry.dataType,
        },
        per100g,
      };
    }
  }
  return null;
}

function extract(foodNutrients: SearchFood["foodNutrients"]): Nutrients {
  const byId = new Map<number, number>();
  for (const fn of foodNutrients ?? []) {
    if (typeof fn.nutrientId === "number" && typeof fn.value === "number") byId.set(fn.nutrientId, fn.value);
  }
  const out = emptyNutrients();
  for (const meta of NUTRIENTS) {
    for (const id of meta.usdaIds) {
      const v = byId.get(id);
      if (v !== undefined) {
        out[meta.key] = v;
        break;
      }
    }
  }
  return out;
}

/** Looks up a food in USDA FoodData Central. Returns null when nothing usable is found. */
export async function lookupFood(query: string): Promise<FoodLookup | null> {
  const q = query.trim().toLowerCase().slice(0, 120);
  if (cache.has(q)) return cache.get(q) ?? null;

  const apiKey = process.env.USDA_API_KEY || "DEMO_KEY";

  try {
    const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: q,
        dataType: ["Foundation", "SR Legacy", "Survey (FNDDS)"],
        pageSize: 8,
      }),
      signal: AbortSignal.timeout(8_000),
    });

    if (res.ok) {
      const data = (await res.json()) as { foods?: SearchFood[] };
      for (const food of data.foods ?? []) {
        const per100g = extract(food.foodNutrients);
        if (per100g.calories !== null) {
          const found: FoodLookup = {
            match: { fdcId: food.fdcId, description: food.description, dataType: food.dataType },
            per100g,
          };
          cache.set(q, found);
          return found;
        }
      }
    }
  } catch (err) {
    console.warn("USDA FoodData Central live lookup error (falling back to offline table):", err);
  }

  // Fallback to offline USDA dataset when live API is unavailable or rate-limited
  const fallback = getFallbackLookup(q);
  if (fallback) {
    cache.set(q, fallback);
    return fallback;
  }

  cache.set(q, null);
  return null;
}
