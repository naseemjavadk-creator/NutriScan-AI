"use client";

import { useState } from "react";
import { api, ApiError, jsonInit } from "@/lib/api";
import { MEAL_TYPES, type Meal, type MealType } from "@/lib/types";

const SCALES = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function MealRow({ meal, onChanged }: { meal: Meal; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(meal.name);
  const [type, setType] = useState<MealType>(meal.meal_type);
  const [scale, setScale] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/meals/${meal.id}`, jsonInit("PATCH", { name, meal_type: type, scale }));
      setEditing(false);
      setScale(1);
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save changes.");
    }
    setBusy(false);
  }

  async function remove() {
    if (!window.confirm(`Delete “${meal.name}” from your diary?`)) return;
    setBusy(true);
    try {
      await api(`/api/meals/${meal.id}`, { method: "DELETE" });
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't delete the meal.");
      setBusy(false);
    }
  }

  const time = new Date(meal.eaten_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <li className="card p-4">
      {editing ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_150px_150px]">
            <div>
              <label className="field-label" htmlFor={`name-${meal.id}`}>Name</label>
              <input id={`name-${meal.id}`} className="input" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor={`type-${meal.id}`}>Meal</label>
              <select id={`type-${meal.id}`} className="input" value={type} onChange={(e) => setType(e.target.value as MealType)}>
                {MEAL_TYPES.map((t) => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor={`scale-${meal.id}`}>Portion</label>
              <select id={`scale-${meal.id}`} className="input" value={scale} onChange={(e) => setScale(Number(e.target.value))}>
                {SCALES.map((s) => <option key={s} value={s}>{s === 1 ? "As saved" : `${s}×`}</option>)}
              </select>
            </div>
          </div>
          {error && <p role="alert" className="text-sm text-fat">{error}</p>}
          <div className="flex gap-2">
            <button className="btn-primary" onClick={save} disabled={busy || !name.trim()}>Save changes</button>
            <button className="btn-quiet" onClick={() => { setEditing(false); setName(meal.name); setType(meal.meal_type); setScale(1); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="font-semibold">{meal.name}</p>
              <p className="text-sm text-muted">{time}</p>
            </div>
            <p className="text-right">
              <span className="font-display text-xl font-bold">{Math.round(meal.calories)}</span>
              <span className="text-sm text-muted"> kcal</span>
            </p>
          </div>
          <p className="mt-1 text-sm text-muted">
            Protein {Math.round(meal.protein_g)} g · Carbs {Math.round(meal.carbs_g)} g · Fat {Math.round(meal.fat_g)} g
          </p>
          {meal.items?.length > 0 && (
            <p className="mt-1 text-sm text-muted">{meal.items.map((i) => `${i.name} (${i.grams} g)`).join(", ")}</p>
          )}
          {error && <p role="alert" className="mt-2 text-sm text-fat">{error}</p>}
          <div className="mt-2 flex gap-1">
            <button className="btn-quiet min-h-[40px] px-3" onClick={() => setEditing(true)} disabled={busy}>Edit</button>
            <button className="btn-quiet min-h-[40px] px-3" onClick={remove} disabled={busy}>Delete</button>
          </div>
        </>
      )}
    </li>
  );
}
