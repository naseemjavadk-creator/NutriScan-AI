import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { normalizeNutrients, sumNutrients } from "@/lib/nutrients";
import { MEAL_TYPES } from "@/lib/types";
import { fail } from "@/lib/http";

const ItemSchema = z.object({
  id: z.string().max(40),
  name: z.string().trim().min(1).max(120),
  grams: z.number().positive().max(3000),
  match: z.object({ fdcId: z.number(), description: z.string().max(300), dataType: z.string().max(60) }).nullable(),
  nutrients: z.record(z.string(), z.number().nullable()),
});

const CreateBody = z.object({
  name: z.string().trim().min(1).max(120),
  meal_type: z.enum(MEAL_TYPES as [string, ...string[]]),
  eaten_at: z.string().datetime().optional(),
  items: z.array(ItemSchema).min(1).max(12),
});

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail(401, "unauthorized", "Log in to see your food diary.");

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from || !to || Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to))) {
    return fail(400, "bad_range", "Provide ISO 'from' and 'to' dates.");
  }

  const { data, error } = await supabase
    .from("meals")
    .select("*")
    .gte("eaten_at", from)
    .lt("eaten_at", to)
    .order("eaten_at", { ascending: true })
    .limit(500);
  if (error) return fail(500, "db_error", "Couldn't load your meals.");
  return NextResponse.json({ meals: data });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail(401, "unauthorized", "Log in to save meals to your diary.");

  const parsed = CreateBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, "bad_request", "That meal couldn't be saved. Check the name and items.");

  // Totals are recomputed on the server; the client's totals are never trusted.
  const items = parsed.data.items.map((i) => ({ ...i, nutrients: normalizeNutrients(i.nutrients) }));
  const { nutrients: totals } = sumNutrients(items.map((i) => i.nutrients));

  const { data, error } = await supabase
    .from("meals")
    .insert({
      user_id: auth.user.id,
      name: parsed.data.name,
      meal_type: parsed.data.meal_type,
      eaten_at: parsed.data.eaten_at ?? new Date().toISOString(),
      calories: totals.calories ?? 0,
      protein_g: totals.protein ?? 0,
      carbs_g: totals.carbs ?? 0,
      fat_g: totals.fat ?? 0,
      items,
      totals,
    })
    .select()
    .single();
  if (error) return fail(500, "db_error", "Couldn't save the meal. Please try again.");
  return NextResponse.json({ meal: data }, { status: 201 });
}
