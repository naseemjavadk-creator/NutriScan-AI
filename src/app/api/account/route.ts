import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { fail } from "@/lib/http";

/** Permanently deletes the signed-in user. Meals and profile are removed by ON DELETE CASCADE. */
export async function DELETE() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail(401, "unauthorized", "Log in first.");

  const admin = createServiceClient();
  if (!admin) {
    return fail(503, "missing_key", "Account deletion is not set up. Add SUPABASE_SERVICE_ROLE_KEY to the server environment.");
  }
  const { error } = await admin.auth.admin.deleteUser(auth.user.id);
  if (error) return fail(500, "delete_failed", "We couldn't delete your account. Please try again.");

  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
