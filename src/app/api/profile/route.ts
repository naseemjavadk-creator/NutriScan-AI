import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_PROFILE } from "@/lib/types";
import { fail } from "@/lib/http";

const Body = z.object({
  display_name: z.string().trim().max(60).nullable().optional(),
  calorie_goal: z.number().int().min(800).max(6000),
  protein_goal: z.number().int().min(0).max(500),
  carbs_goal: z.number().int().min(0).max(1000),
  fat_goal: z.number().int().min(0).max(400),
});

export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail(401, "unauthorized", "Log in to see your profile.");
  const { data } = await supabase
    .from("profiles")
    .select("display_name, calorie_goal, protein_goal, carbs_goal, fat_goal")
    .eq("id", auth.user.id)
    .maybeSingle();
  return NextResponse.json({ profile: data ?? DEFAULT_PROFILE, email: auth.user.email });
}

export async function PUT(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail(401, "unauthorized", "Log in to save your goals.");
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, "bad_request", "Check your goals. Calories must be between 800 and 6000.");

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: auth.user.id, ...parsed.data, updated_at: new Date().toISOString() });
  if (error) return fail(500, "db_error", "Couldn't save your goals.");
  return NextResponse.json({ ok: true });
}
