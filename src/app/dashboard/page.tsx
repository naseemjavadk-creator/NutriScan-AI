"use client";

import Link from "next/link";
import { useMemo } from "react";
import GoalBar from "@/components/GoalBar";
import MealRow from "@/components/MealRow";
import PlateRing from "@/components/PlateRing";
import { addDays, startOfDay } from "@/lib/dates";
import { sumMeals, useDiary } from "@/lib/useDiary";
import { MEAL_TYPES } from "@/lib/types";

export default function Dashboard() {
  const { from, to } = useMemo(() => {
    const s = startOfDay(new Date());
    return { from: s, to: addDays(s, 1) };
  }, []);
  const { meals, profile, loading, error, reload } = useDiary(from, to);
  const totals = sumMeals(meals);
  const remaining = profile.calorie_goal - totals.calories;

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 md:py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold md:text-4xl">Today</h1>
          <p className="text-muted">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>
        <Link href="/scan" className="btn-primary">Scan a meal</Link>
      </div>

      {error && <p role="alert" className="mt-6 rounded-xl bg-[#FFF1EE] p-4 text-[15px]">{error}</p>}

      <section className="card mt-6 grid items-center gap-6 rounded-[2rem] p-6 md:grid-cols-[auto_1fr] md:p-9" aria-label="Daily calories">
        <div className="flex justify-center">
          <PlateRing protein={totals.protein} carbs={totals.carbs} fat={totals.fat} size={210}>
            <div>
              <div className="font-display text-5xl font-extrabold leading-none">{loading ? "–" : Math.round(totals.calories).toLocaleString()}</div>
              <div className="mt-1 text-sm text-muted">kcal eaten</div>
            </div>
          </PlateRing>
        </div>
        <div>
          <p className="font-display text-2xl font-bold">
            {loading ? "Loading…" : remaining >= 0 ? `${Math.round(remaining).toLocaleString()} kcal left` : `${Math.round(-remaining).toLocaleString()} kcal over`}
          </p>
          <p className="mt-1 text-muted">Your daily goal is {profile.calorie_goal.toLocaleString()} kcal. Goals are estimates, not medical advice. <Link className="font-medium text-leaf-700 underline" href="/profile">Change goals</Link></p>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-leaf-50" role="progressbar" aria-label="Calorie goal progress" aria-valuenow={Math.round(totals.calories)} aria-valuemin={0} aria-valuemax={profile.calorie_goal}>
            <div className="h-full rounded-full bg-leaf-500" style={{ width: `${Math.min(100, (totals.calories / profile.calorie_goal) * 100)}%` }} />
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-3" aria-label="Macronutrient goals">
        <GoalBar label="Protein" value={totals.protein} goal={profile.protein_goal} unit="g" color="#2F9E5B" />
        <GoalBar label="Carbs" value={totals.carbs} goal={profile.carbs_goal} unit="g" color="#E3A21A" />
        <GoalBar label="Fat" value={totals.fat} goal={profile.fat_goal} unit="g" color="#E2694F" />
      </section>

      <section className="mt-10 space-y-8" aria-label="Meals today">
        {!loading && meals.length === 0 && (
          <div className="card p-8 text-center">
            <p className="font-display text-xl font-semibold">Nothing logged yet today</p>
            <p className="mt-1 text-muted">Scan a meal and save it to start your diary.</p>
            <Link href="/scan" className="btn-primary mt-4">Scan a meal</Link>
          </div>
        )}
        {MEAL_TYPES.map((t) => {
          const list = meals.filter((m) => m.meal_type === t);
          if (list.length === 0) return null;
          const sub = sumMeals(list);
          return (
            <div key={t}>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-xl font-semibold">{t[0].toUpperCase() + t.slice(1)}</h2>
                <span className="text-sm text-muted">{Math.round(sub.calories)} kcal</span>
              </div>
              <ul className="space-y-3">{list.map((m) => <MealRow key={m.id} meal={m} onChanged={reload} />)}</ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}
