"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import NutritionReport, { type PortionSource } from "./NutritionReport";
import SetupNotice from "./SetupNotice";
import { api, ApiError, jsonInit } from "@/lib/api";
import { prepareImage } from "@/lib/image";
import { guessMealType } from "@/lib/format";
import { MEAL_TYPES, type AnalysisResult, type DetectedItem, type MealType, type NutritionReportData } from "@/lib/types";

type Stage = "pick" | "analyzing" | "confirm" | "calculating" | "results";
interface EditableItem extends DetectedItem {
  userEdited: boolean;
}

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_INPUT_BYTES = 25 * 1024 * 1024;
const PENDING_KEY = "nutriscan:pending";

let counter = 0;
const newId = () => `m-${Date.now()}-${counter++}`;
const blankItem = (): EditableItem => ({ id: newId(), name: "", searchQuery: "", grams: 100, confidence: 1, userEdited: true });

export default function ScanFlow() {
  const [stage, setStage] = useState<Stage>("pick");
  const [preview, setPreview] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [report, setReport] = useState<NutritionReportData | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [mealName, setMealName] = useState("");
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "needs-login">("idle");
  const uploadRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMealType(guessMealType()), []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  // Restore a report that was waiting while the user logged in to save it.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PENDING_KEY);
      if (!raw) return;
      sessionStorage.removeItem(PENDING_KEY);
      const p = JSON.parse(raw);
      if (p?.report?.items) {
        setReport(p.report);
        setItems(p.items ?? []);
        setAnalysis({ isFood: true, imageQuality: "clear", items: [], questions: [] });
        setMealName(p.mealName ?? "");
        setMealType(p.mealType ?? "lunch");
        setStage("results");
      }
    } catch { /* ignore corrupt data */ }
  }, []);

  const portionSource = useMemo(() => {
    const m: Record<string, PortionSource> = {};
    items.forEach((i) => (m[i.id] = i.userEdited ? "you" : "estimated"));
    return m;
  }, [items]);

  /** Calorie-weighted AI confidence over the items the user hasn't changed. */
  const confidence = useMemo(() => {
    if (!report) return null;
    let w = 0, s = 0;
    for (const it of report.items) {
      const src = items.find((i) => i.id === it.id);
      if (!src || src.userEdited) continue;
      const weight = it.nutrients.calories ?? 1;
      w += weight;
      s += weight * src.confidence;
    }
    return w > 0 ? s / w : null;
  }, [report, items]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError({ code: "bad_type", message: "Choose a JPG, PNG or WEBP photo." });
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setError({ code: "too_large", message: "That photo is too large. Choose one under 25 MB." });
      return;
    }
    try {
      const prepared = await prepareImage(file);
      setBlob(prepared);
      setPreview(URL.createObjectURL(prepared));
    } catch (e) {
      setError({ code: "image", message: e instanceof Error ? e.message : "We couldn't read that image." });
    }
  }

  function reset() {
    setStage("pick"); setPreview(null); setBlob(null); setAnalysis(null); setItems([]);
    setReport(null); setError(null); setMealName(""); setSaveState("idle");
    if (uploadRef.current) uploadRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  }

  async function analyze() {
    if (!blob) return;
    setError(null);
    setStage("analyzing");
    try {
      const fd = new FormData();
      fd.append("image", blob, "meal.jpg");
      const result = await api<AnalysisResult>("/api/analyze", { method: "POST", body: fd });
      setAnalysis(result);
      setItems(result.items.map((i) => ({ ...i, userEdited: false })));
      setStage("confirm");
    } catch (e) {
      setError(toError(e));
      setStage("pick");
    }
  }

  function startManual() {
    setError(null);
    setAnalysis({ isFood: true, imageQuality: "clear", items: [], questions: [] });
    setItems([blankItem()]);
    setStage("confirm");
  }

  function updateItem(id: string, patch: Partial<EditableItem>) {
    setItems((list) => list.map((i) => (i.id === id ? { ...i, ...patch, userEdited: true } : i)));
  }

  const itemsValid = items.length > 0 && items.every((i) => i.name.trim() && i.grams >= 1 && i.grams <= 3000);

  async function calculate() {
    setError(null);
    setStage("calculating");
    try {
      const data = await api<NutritionReportData>(
        "/api/nutrition",
        jsonInit("POST", {
          items: items.map((i) => ({ id: i.id, name: i.name.trim(), searchQuery: (i.searchQuery || i.name).trim(), grams: i.grams })),
        }),
      );
      setReport(data);
      setMealName(items.map((i) => i.name.trim()).join(", ").slice(0, 120));
      setSaveState("idle");
      setStage("results");
    } catch (e) {
      setError(toError(e));
      setStage("confirm");
    }
  }

  async function save() {
    if (!report) return;
    setSaveState("saving");
    try {
      await api("/api/meals", jsonInit("POST", { name: mealName.trim() || "Meal", meal_type: mealType, items: report.items }));
      setSaveState("saved");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        try {
          sessionStorage.setItem(PENDING_KEY, JSON.stringify({ report, items, mealName, mealType }));
        } catch { /* storage may be unavailable */ }
        setSaveState("needs-login");
      } else {
        setSaveState("idle");
        setError(toError(e));
      }
    }
  }

  const busy = stage === "analyzing" || stage === "calculating";

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 md:py-12">
      <h1 className="text-3xl font-bold md:text-4xl">
        {stage === "results" ? "Nutrition results" : stage === "confirm" ? "Check your foods" : "Scan a meal"}
      </h1>

      {error && (
        <div className="mt-5" aria-live="polite">
          {error.code === "missing_key" ? (
            <SetupNotice title="Setup needed"><p>{error.message}</p></SetupNotice>
          ) : (
            <p role="alert" className="rounded-xl border border-fat/40 bg-[#FFF1EE] p-4 text-[15px]">{error.message}</p>
          )}
        </div>
      )}

      {(stage === "pick" || stage === "analyzing") && (
        <div className="mt-6 space-y-5">
          <div className="card overflow-hidden">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Preview of your meal" className="max-h-[420px] w-full object-cover" />
            ) : (
              <div className="grid min-h-[260px] place-items-center bg-leaf-50 p-8 text-center">
                <div>
                  <p className="font-display text-xl font-semibold">Add a photo of your food</p>
                  <p className="mt-1 text-muted">Top-down, well lit, with the whole plate in view works best.</p>
                </div>
              </div>
            )}
          </div>

          <input ref={uploadRef} type="file" accept={ACCEPT} className="sr-only" id="upload" onChange={(e) => onFile(e.target.files?.[0])} />
          <input ref={cameraRef} type="file" accept={ACCEPT} capture="environment" className="sr-only" id="camera" onChange={(e) => onFile(e.target.files?.[0])} />

          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => cameraRef.current?.click()}>Take a photo</button>
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => uploadRef.current?.click()}>
              {preview ? "Choose a different photo" : "Upload a photo"}
            </button>
          </div>

          {stage === "analyzing" ? (
            <div className="card flex items-center gap-4 border border-leaf-200 bg-leaf-50 p-5">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-leaf-600 border-t-transparent" />
              <div>
                <p className="font-semibold text-leaf-900">Analyzing with Gemini AI…</p>
                <p className="text-xs text-muted">Identifying ingredients and calculating portion weights</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <button type="button" className="btn-primary px-7" disabled={!blob || busy} onClick={analyze}>
                Analyze My Food
              </button>
              <button type="button" className="btn-quiet" disabled={busy} onClick={startManual}>Add foods without a photo</button>
            </div>
          )}
          <p className="text-sm text-muted">Photos are sent for analysis and are not stored by NutriScan AI. Max 5 MB after resizing; JPG, PNG or WEBP.</p>
        </div>
      )}

      {(stage === "confirm" || stage === "calculating") && analysis && (
        <div className="mt-6 space-y-5">
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Your meal" className="h-40 w-full rounded-2xl object-cover sm:h-52" />
          )}

          {!analysis.isFood && (
            <p role="status" className="rounded-xl bg-[#FFF8E6] p-4 text-[15px]">
              We couldn’t find food in that photo. Add the foods yourself below, or go back and try another photo.
            </p>
          )}
          {analysis.isFood && analysis.imageQuality === "unclear" && (
            <p role="status" className="rounded-xl bg-[#FFF8E6] p-4 text-[15px]">
              The photo is a little unclear, so please confirm each food and portion before we calculate.
            </p>
          )}
          {analysis.questions.length > 0 && (
            <div className="card p-5">
              <p className="font-semibold">These details change the result. Adjust the foods below if you know them:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] text-muted">
                {analysis.questions.map((q) => <li key={q}>{q}</li>)}
              </ul>
            </div>
          )}

          <ul className="space-y-3">
            {items.map((it, idx) => (
              <li key={it.id} className="card p-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
                  <div>
                    <label className="field-label" htmlFor={`n-${it.id}`}>Food {idx + 1}</label>
                    <input
                      id={`n-${it.id}`}
                      className="input"
                      value={it.name}
                      maxLength={120}
                      placeholder="e.g. fried rice"
                      onChange={(e) => updateItem(it.id, { name: e.target.value, searchQuery: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="field-label" htmlFor={`g-${it.id}`}>Portion (g)</label>
                    <input
                      id={`g-${it.id}`}
                      className="input"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={3000}
                      value={Number.isFinite(it.grams) ? it.grams : ""}
                      onChange={(e) => updateItem(it.id, { grams: e.target.value === "" ? NaN : Number(e.target.value) })}
                    />
                  </div>
                  <button type="button" className="btn-quiet" onClick={() => setItems((l) => l.filter((x) => x.id !== it.id))} aria-label={`Remove food ${idx + 1}`}>
                    Remove
                  </button>
                </div>
                {(it.note || (!it.userEdited && it.confidence < 0.5)) && (
                  <p className="mt-2 text-sm text-muted">
                    {!it.userEdited && it.confidence < 0.5 && <span className="font-medium text-fat">Not sure about this one. </span>}
                    {it.note}
                  </p>
                )}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-secondary" onClick={() => setItems((l) => [...l, blankItem()])} disabled={items.length >= 12}>
              Add a food
            </button>
            <p className="text-sm text-muted">Tip: include the cooking method when it matters, like “fried rice” or “grilled chicken”.</p>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-line pt-5">
            <button type="button" className="btn-primary px-7" disabled={!itemsValid || stage === "calculating"} onClick={calculate}>
              {stage === "calculating" ? "Calculating…" : "Calculate nutrition"}
            </button>
            <button type="button" className="btn-quiet" onClick={reset} disabled={stage === "calculating"}>Start over</button>
          </div>
          {!itemsValid && <p className="text-sm text-muted">Every food needs a name and a portion between 1 and 3000 g.</p>}
        </div>
      )}

      {stage === "results" && report && (
        <div className="mt-6 space-y-6">
          <NutritionReport data={report} confidence={confidence} portionSource={portionSource} />

          <section className="card p-5 md:p-6" aria-label="Save to diary">
            <h2 className="text-xl font-semibold">Save to your food diary</h2>
            {saveState === "saved" ? (
              <div role="status" className="mt-3">
                <p className="font-medium text-leaf-700">Saved to your diary.</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link href="/dashboard" className="btn-primary">See today</Link>
                  <button className="btn-secondary" onClick={reset}>Scan another meal</button>
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                  <div>
                    <label className="field-label" htmlFor="mealName">Meal name</label>
                    <input id="mealName" className="input" value={mealName} maxLength={120} onChange={(e) => setMealName(e.target.value)} />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="mealType">Meal</label>
                    <select id="mealType" className="input" value={mealType} onChange={(e) => setMealType(e.target.value as MealType)}>
                      {MEAL_TYPES.map((t) => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
                {saveState === "needs-login" ? (
                  <p role="status" className="rounded-xl bg-leaf-50 p-4 text-[15px]">
                    Log in or create a free account to save this meal. Your results will be waiting for you.{" "}
                    <Link className="font-semibold text-leaf-700 underline" href="/login?next=/scan">Log in</Link> or{" "}
                    <Link className="font-semibold text-leaf-700 underline" href="/signup">sign up</Link>.
                  </p>
                ) : (
                  <button className="btn-primary" onClick={save} disabled={saveState === "saving"}>
                    {saveState === "saving" ? "Saving…" : "Save meal"}
                  </button>
                )}
              </div>
            )}
          </section>

          <div className="flex flex-wrap gap-3">
            <button className="btn-secondary" onClick={() => setStage("confirm")}>Edit foods and portions</button>
            <button className="btn-quiet" onClick={reset}>Scan another meal</button>
          </div>
        </div>
      )}
    </div>
  );
}

function toError(e: unknown) {
  if (e instanceof ApiError) return { code: e.code, message: e.message };
  return { code: "error", message: "Something went wrong. Please try again." };
}
