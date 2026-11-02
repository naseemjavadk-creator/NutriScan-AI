import { NextResponse } from "next/server";
import { z } from "zod";
import { lookupFood, MissingKeyError } from "@/lib/usda";
import { emptyNutrients, scaleNutrients, sumNutrients } from "@/lib/nutrients";
import type { ItemNutrition, NutritionReportData } from "@/lib/types";
import { fail } from "@/lib/http";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  items: z
    .array(
      z.object({
        id: z.string().max(40),
        name: z.string().trim().min(1).max(120),
        searchQuery: z.string().trim().min(1).max(120),
        grams: z.number().positive().max(3000),
      }),
    )
    .min(1)
    .max(12),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, "bad_request", "Add at least one food with a portion between 1 and 3000 g.");

  try {
    const items: ItemNutrition[] = await Promise.all(
      parsed.data.items.map(async (it) => {
        const found = await lookupFood(it.searchQuery);
        return {
          id: it.id,
          name: it.name,
          grams: it.grams,
          match: found?.match ?? null,
          nutrients: found ? scaleNutrients(found.per100g, it.grams / 100) : emptyNutrients(),
        };
      }),
    );
    const { nutrients, partial } = sumNutrients(items.map((i) => i.nutrients));
    const body: NutritionReportData = { items, totals: nutrients, partial };
    return NextResponse.json(body);
  } catch (err) {
    if (err instanceof MissingKeyError) {
      return fail(503, "missing_key", "The nutrition database is not set up yet. Add USDA_API_KEY to .env.local and restart the server. A free key is available at fdc.nal.usda.gov.");
    }
    console.error("nutrition failed", err);
    return fail(502, "lookup_failed", "The nutrition database didn't respond. Please try again.");
  }
}
