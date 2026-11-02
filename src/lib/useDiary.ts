"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "./api";
import { DEFAULT_PROFILE, type Meal, type Profile } from "./types";

/** Loads the signed-in user's meals in [from, to) plus their goals. */
export function useDiary(from: Date, to: Date) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  const reload = useCallback(async () => {
    setError(null);
    try {
      const [m, p] = await Promise.all([
        api<{ meals: Meal[] }>(`/api/meals?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`),
        api<{ profile: Profile }>("/api/profile"),
      ]);
      setMeals(m.meals.map((x) => ({ ...x, calories: Number(x.calories), protein_g: Number(x.protein_g), carbs_g: Number(x.carbs_g), fat_g: Number(x.fat_g) })));
      setProfile(p.profile);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load your diary.");
    }
    setLoading(false);
  }, [fromIso, toIso]);

  useEffect(() => {
    setLoading(true);
    reload();
  }, [reload]);

  return { meals, profile, loading, error, reload };
}

export function sumMeals(meals: Meal[]) {
  return meals.reduce(
    (s, m) => ({ calories: s.calories + m.calories, protein: s.protein + m.protein_g, carbs: s.carbs + m.carbs_g, fat: s.fat + m.fat_g }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}
