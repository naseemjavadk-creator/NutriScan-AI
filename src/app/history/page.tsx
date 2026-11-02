"use client";

import { useMemo, useState } from "react";
import MealRow from "@/components/MealRow";
import WeeklyChart, { type DayTotals } from "@/components/WeeklyChart";
import { addDays, localKey, startOfDay } from "@/lib/dates";
import { sumMeals, useDiary } from "@/lib/useDiary";
import { MEAL_TYPES } from "@/lib/types";

export default function History() {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [selected, setSelected] = useState(today);

  // Seven days ending on the selected day.
  const from = addDays(selected, -6);
  const to = addDays(selected, 1);
  const { meals, profile, loading, error, reload } = useDiary(from, to);

  const days: DayTotals[] = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(from, i);
    const key = localKey(d);
    const t = sumMeals(meals.filter((m) => localKey(new Date(m.eaten_at)) === key));
    return { key, label: d.toLocaleDateString(undefined, { weekday: "short" }), ...t };
  });
  const dayKey = localKey(selected);
  const dayMeals = meals.filter((m) => localKey(new Date(m.eaten_at)) === dayKey);
  const dayTotals = sumMeals(dayMeals);
  const week = sumMeals(meals);
  const loggedDays = days.filter((d) => d.calories > 0).length;
  const isToday = dayKey === localKey(today);

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 md:py-12">
      <h1 className="text-3xl font-bold md:text-4xl">Meal history</h1>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button className="btn-secondary" onClick={() => setSelected(addDays(selected, -1))} aria-label="Previous day">Previous</button>
        <label className="sr-only" htmlFor="day">Choose a day</label>
        <input
          id="day"
          type="date"
          className="input w-auto"
          max={localKey(today)}
          value={dayKey}
          onChange={(e) => {
            if (!e.target.value) return;
            const [y, m, d] = e.target.value.split("-").map(Number);
            setSelected(new Date(y, m - 1, d));
          }}
        />
        <button className="btn-secondary" disabled={isToday} onClick={() => setSelected(addDays(selected, 1))} aria-label="Next day">Next</button>
        {!isToday && <button className="btn-quiet" onClick={() => setSelected(today)}>Back to today</button>}
      </div>

      {error && <p role="alert" className="mt-6 rounded-xl bg-[#FFF1EE] p-4 text-[15px]">{error}</p>}

      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_1.3fr]">
        <section className="card p-6" aria-label="Summary">
          <h2 className="text-xl font-semibold">{selected.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</h2>
          <p className="mt-3">
            <span className="font-display text-5xl font-extrabold">{loading ? "–" : Math.round(dayTotals.calories).toLocaleString()}</span>
            <span className="text-muted"> / {profile.calorie_goal.toLocaleString()} kcal</span>
          </p>
          <p className="mt-2 text-sm text-muted">
            Protein {Math.round(dayTotals.protein)} g · Carbs {Math.round(dayTotals.carbs)} g · Fat {Math.round(dayTotals.fat)} g
          </p>
          <hr className="my-5 border-line" />
          <h3 className="font-semibold">Last 7 days</h3>
          <p className="mt-1 text-sm text-muted">
            {Math.round(week.calories).toLocaleString()} kcal in total
            {loggedDays > 0 && <> · about {Math.round(week.calories / loggedDays).toLocaleString()} kcal on days you logged</>}
          </p>
        </section>
        <section className="card p-6" aria-label="Weekly chart">
          <WeeklyChart days={days} calorieGoal={profile.calorie_goal} />
        </section>
      </div>

      <section className="mt-10 space-y-8" aria-label="Meals">
        {!loading && dayMeals.length === 0 && (
          <p className="card p-8 text-center text-muted">No meals saved for this day.</p>
        )}
        {MEAL_TYPES.map((t) => {
          const list = dayMeals.filter((m) => m.meal_type === t);
          if (list.length === 0) return null;
          return (
            <div key={t}>
              <h2 className="mb-3 text-xl font-semibold">{t[0].toUpperCase() + t.slice(1)}</h2>
              <ul className="space-y-3">{list.map((m) => <MealRow key={m.id} meal={m} onChanged={reload} />)}</ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}
