"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient, supabaseConfigured } from "@/lib/supabase/client";
import SetupNotice from "./SetupNotice";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const rawNext = params.get("next") ?? "/dashboard";
  // Only allow same-site relative redirects.
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!supabaseConfigured) {
    return (
      <SetupNotice title="Accounts aren’t set up yet">
        <p>Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, run supabase/schema.sql, then restart the server.</p>
        <p>You can still <Link className="font-semibold underline" href="/scan">scan a meal</Link> without an account.</p>
      </SetupNotice>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (mode === "signup" && password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    setBusy(true);
    const sb = createClient();
    if (mode === "login") {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) setError("That email and password don’t match. Check them and try again.");
      else {
        router.push(next);
        router.refresh();
      }
    } else {
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}${next}` },
      });
      if (error) setError(error.message);
      else if (data.session) {
        router.push(next);
        router.refresh();
      } else {
        setNotice("Check your inbox for a confirmation link, then log in.");
      }
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-6 md:p-8">
      <div>
        <label className="field-label" htmlFor="email">Email</label>
        <input id="email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="field-label" htmlFor="password">Password</label>
        <input
          id="password"
          className="input"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          minLength={mode === "signup" ? 8 : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {mode === "signup" && <p className="mt-1 text-sm text-muted">At least 8 characters.</p>}
      </div>
      {error && <p role="alert" className="rounded-xl bg-[#FFF1EE] p-3 text-sm">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-leaf-50 p-3 text-sm">{notice}</p>}
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? "One moment…" : mode === "login" ? "Log in" : "Create account"}
      </button>
      <p className="text-center text-sm text-muted">
        {mode === "login" ? (
          <>New here? <Link className="font-semibold text-leaf-700 underline" href="/signup">Create an account</Link></>
        ) : (
          <>Already have an account? <Link className="font-semibold text-leaf-700 underline" href="/login">Log in</Link></>
        )}
      </p>
    </form>
  );
}
