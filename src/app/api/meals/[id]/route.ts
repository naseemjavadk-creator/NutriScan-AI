import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { normalizeNutrients, scaleNutrients, sumNutrients } from "@/lib/nutrients";
import { MEAL_TYPES, type ItemNutrition } from "@/lib/types";
import { fail } from "@/lib/http";

const Patch = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  meal_type: z.enum(MEAL_TYPES as [string, ...string[]]).optional(),
  /** Multiplies every portion, e.g. 0.5 for "I ate half". */
  scale: z.number().min(0.1).max(10).optional(),
});

const idOk = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!idOk(id)) return fail(400, "bad_id", "Invalid meal.");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail(401, "unauthorized", "Log in to edit meals.");

  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, "bad_request", "Those changes aren't valid.");
  const { name, meal_type, scale } = parsed.data;

  const update: Record<string, unknown> = {};
  if (name) update.name = name;
  if (meal_type) update.meal_type = meal_type;

  if (scale && scale !== 1) {
    const { data: existing, error } = await supabase.from("meals").select("items").eq("id", id).single();
    if (error || !existing) return fail(404, "not_found", "Meal not found.");
    const items = (existing.items as ItemNutrition[]).map((i) => ({
      ...i,
      grams: Math.round(i.grams * scale),
      nutrients: scaleNutrients(normalizeNutrients(i.nutrients), scale),
    }));
    const { nutrients: totals } = sumNutrients(items.map((i) => i.nutrients));
    Object.assign(update, {
      items,
      totals,
      calories: totals.calories ?? 0,
      protein_g: totals.protein ?? 0,
      carbs_g: totals.carbs ?? 0,
      fat_g: totals.fat ?? 0,
    });
  }
  if (Object.keys(update).length === 0) return fail(400, "nothing_to_update", "No changes provided.");

  const { data, error } = await supabase.from("meals").update(update).eq("id", id).select().single();
  if (error || !data) return fail(404, "not_found", "Meal not found.");
  return NextResponse.json({ meal: data });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!idOk(id)) return fail(400, "bad_id", "Invalid meal.");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail(401, "unauthorized", "Log in to delete meals.");
  const { error } = await supabase.from("meals").delete().eq("id", id);
  if (error) return fail(500, "db_error", "Couldn't delete the meal.");
  return NextResponse.json({ ok: true });
}
