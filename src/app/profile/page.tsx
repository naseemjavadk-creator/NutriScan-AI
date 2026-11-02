"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, jsonInit } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_PROFILE, type Profile } from "@/lib/types";

const ACTIVITY = [
  { label: "Mostly sitting", factor: 1.2 },
  { label: "Light activity (1–3 days a week)", factor: 1.375 },
  { label: "Moderate activity (3–5 days a week)", factor: 1.55 },
  { label: "Very active (6–7 days a week)", factor: 1.725 },
];
const AIMS = [
  { label: "Lose weight gradually", adj: 0.85 },
  { label: "Maintain weight", adj: 1 },
  { label: "Gain weight gradually", adj: 1.1 },
];

export default function ProfilePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [goals, setGoals] = useState({ calories: "2000", protein: "100", carbs: "250", fat: "70" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [est, setEst] = useState({ sex: "female", age: "30", height: "170", weight: "70", activity: "1.375", aim: "1" });
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api<{ profile: Profile; email: string }>("/api/profile")
      .then(({ profile, email }) => {
        setEmail(email ?? "");
        setName(profile.display_name ?? "");
        setGoals({ calories: String(profile.calorie_goal), protein: String(profile.protein_goal), carbs: String(profile.carbs_goal), fat: String(profile.fat_goal) });
      })
      .catch(() => {
        const p = DEFAULT_PROFILE;
        setGoals({ calories: String(p.calorie_goal), protein: String(p.protein_goal), carbs: String(p.carbs_goal), fat: String(p.fat_goal) });
      });
  }, []);

  function applyEstimate() {
    const w = Number(est.weight), h = Number(est.height), a = Number(est.age);
    if (!(w > 20 && h > 100 && a >= 18)) {
      setMsg({ ok: false, text: "Enter an adult age (18+), height in cm and weight in kg to estimate." });
      return;
    }
    // Mifflin-St Jeor equation, then an activity factor. A rough starting point only.
    const bmr = 10 * w + 6.25 * h - 5 * a + (est.sex === "male" ? 5 : -161);
    const kcal = Math.round((bmr * Number(est.activity) * Number(est.aim)) / 10) * 10;
    const protein = Math.round(w * 1.6);
    const fat = Math.round((kcal * 0.28) / 9);
    const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
    setGoals({ calories: String(kcal), protein: String(protein), carbs: String(carbs), fat: String(fat) });
    setMsg({ ok: true, text: "Goals filled in from your estimate. Review them, then save." });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await api("/api/profile", jsonInit("PUT", {
        display_name: name.trim() || null,
        calorie_goal: Math.round(Number(goals.calories)),
        protein_goal: Math.round(Number(goals.protein)),
        carbs_goal: Math.round(Number(goals.carbs)),
        fat_goal: Math.round(Number(goals.fat)),
      }));
      setMsg({ ok: true, text: "Goals saved." });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : "Couldn't save your goals." });
    }
    setSaving(false);
  }

  async function deleteAccount() {
    setDeleting(true);
    try {
      await api("/api/account", { method: "DELETE" });
      await createClient().auth.signOut();
      router.push("/");
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : "Couldn't delete your account." });
      setDeleting(false);
    }
  }

  const num = (k: keyof typeof goals, label: string, unit: string) => (
    <div>
      <label className="field-label" htmlFor={`goal-${k}`}>{label}</label>
      <div className="flex items-center gap-2">
        <input id={`goal-${k}`} className="input" type="number" inputMode="numeric" min={0} value={goals[k]} onChange={(e) => setGoals({ ...goals, [k]: e.target.value })} />
        <span className="w-10 text-sm text-muted">{unit}</span>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-5 py-8 md:py-12">
      <h1 className="text-3xl font-bold md:text-4xl">Profile and settings</h1>

      <form onSubmit={save} className="card space-y-5 p-6">
        <div>
          <h2 className="text-xl font-semibold">Your daily goals</h2>
          <p className="mt-1 text-sm text-muted">
            Goals are rough estimates to help you track, not medical advice. Needs vary with health, age and medications.
            A doctor or registered dietitian can set targets that fit you.
          </p>
        </div>
        <div>
          <label className="field-label" htmlFor="name">Display name (optional)</label>
          <input id="name" className="input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
          {email && <p className="mt-1 text-sm text-muted">Signed in as {email}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {num("calories", "Calories", "kcal")}
          {num("protein", "Protein", "g")}
          {num("carbs", "Carbohydrates", "g")}
          {num("fat", "Fat", "g")}
        </div>
        {msg && <p role="status" className={`rounded-xl p-3 text-sm ${msg.ok ? "bg-leaf-50" : "bg-[#FFF1EE]"}`}>{msg.text}</p>}
        <button className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save goals"}</button>
      </form>

      <section className="card space-y-4 p-6" aria-label="Goal estimator">
        <div>
          <h2 className="text-xl font-semibold">Not sure where to start?</h2>
          <p className="mt-1 text-sm text-muted">This uses a standard formula (Mifflin-St Jeor) for adults. It’s a rough starting point, not a prescription.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="field-label" htmlFor="sex">Sex</label>
            <select id="sex" className="input" value={est.sex} onChange={(e) => setEst({ ...est, sex: e.target.value })}>
              <option value="female">Female</option><option value="male">Male</option>
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="age">Age</label>
            <input id="age" className="input" type="number" inputMode="numeric" value={est.age} onChange={(e) => setEst({ ...est, age: e.target.value })} />
          </div>
          <div>
            <label className="field-label" htmlFor="height">Height (cm)</label>
            <input id="height" className="input" type="number" inputMode="numeric" value={est.height} onChange={(e) => setEst({ ...est, height: e.target.value })} />
          </div>
          <div>
            <label className="field-label" htmlFor="weight">Weight (kg)</label>
            <input id="weight" className="input" type="number" inputMode="numeric" value={est.weight} onChange={(e) => setEst({ ...est, weight: e.target.value })} />
          </div>
          <div>
            <label className="field-label" htmlFor="activity">Activity</label>
            <select id="activity" className="input" value={est.activity} onChange={(e) => setEst({ ...est, activity: e.target.value })}>
              {ACTIVITY.map((a) => <option key={a.factor} value={a.factor}>{a.label}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="aim">Aim</label>
            <select id="aim" className="input" value={est.aim} onChange={(e) => setEst({ ...est, aim: e.target.value })}>
              {AIMS.map((a) => <option key={a.adj} value={a.adj}>{a.label}</option>)}
            </select>
          </div>
        </div>
        <button type="button" className="btn-secondary" onClick={applyEstimate}>Estimate my goals</button>
      </section>

      <section className="card space-y-3 border-fat/30 p-6" aria-label="Delete account">
        <h2 className="text-xl font-semibold">Delete your account</h2>
        <p className="text-sm text-muted">
          This permanently removes your account, goals and every saved meal. It can’t be undone. Photos are never stored, so
          there’s nothing else to remove.
        </p>
        <div className="max-w-xs">
          <label className="field-label" htmlFor="confirm">Type DELETE to confirm</label>
          <input id="confirm" className="input" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
        </div>
        <button className="btn bg-fat text-white hover:bg-[#c9553d]" disabled={confirmText !== "DELETE" || deleting} onClick={deleteAccount}>
          {deleting ? "Deleting…" : "Delete account and data"}
        </button>
      </section>
    </div>
  );
}
