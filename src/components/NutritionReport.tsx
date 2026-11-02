import PlateRing from "./PlateRing";
import { NUTRIENTS, NUTRIENT_BY_KEY, type NutrientKey, type Nutrients } from "@/lib/nutrients";
import { formatNutrient } from "@/lib/format";
import type { NutritionReportData } from "@/lib/types";

export type PortionSource = "estimated" | "you";

export function confidenceLabel(c: number): "High" | "Medium" | "Low" {
  return c >= 0.75 ? "High" : c >= 0.5 ? "Medium" : "Low";
}

function Bar({ value, max, color = "#2F9E5B" }: { value: number; max: number; color?: string }) {
  const w = Math.min(100, (value / max) * 100);
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-leaf-50" aria-hidden>
      <div className="h-full rounded-full" style={{ width: `${w}%`, background: color }} />
    </div>
  );
}

function NutrientRow({ k, n, partial }: { k: NutrientKey; n: Nutrients; partial: boolean }) {
  const meta = NUTRIENT_BY_KEY[k];
  const v = n[k];
  return (
    <div className="py-2.5">
      <div className="flex items-baseline justify-between gap-3 text-[15px]">
        <span>{meta.label}</span>
        <span className={v === null ? "text-muted" : "font-medium"}>
          {partial && v !== null && (
            <span title="Some foods had no data for this nutrient, so the real total may be higher." className="text-muted">at least </span>
          )}
          {formatNutrient(k, v)}
        </span>
      </div>
      {v !== null && meta.dv ? (
        <div className="mt-1.5 flex items-center gap-3">
          <Bar value={v} max={meta.dv} />
          <span className="w-12 shrink-0 text-right text-xs text-muted">{Math.round((v / meta.dv) * 100)}%</span>
        </div>
      ) : null}
    </div>
  );
}

export default function NutritionReport({
  data,
  confidence,
  portionSource,
}: {
  data: NutritionReportData;
  /** Calorie-weighted model confidence 0..1, or null when every portion was set by the user. */
  confidence: number | null;
  portionSource: Record<string, PortionSource>;
}) {
  const t = data.totals;
  const partial = new Set(data.partial);
  const unmatched = data.items.filter((i) => !i.match);
  const kcal = t.calories;

  const macros: { key: NutrientKey; color: string; kcalPer: number }[] = [
    { key: "protein", color: "#2F9E5B", kcalPer: 4 },
    { key: "carbs", color: "#E3A21A", kcalPer: 4 },
    { key: "fat", color: "#E2694F", kcalPer: 9 },
  ];
  const macroKcal = macros.reduce((s, m) => s + (t[m.key] ?? 0) * m.kcalPer, 0);

  return (
    <div className="space-y-6">
      <section className="card settle grid items-center gap-6 rounded-[2rem] p-6 md:grid-cols-[auto_1fr] md:p-9">
        <div className="flex justify-center">
          <PlateRing protein={t.protein ?? 0} carbs={t.carbs ?? 0} fat={t.fat ?? 0} size={230}>
            <div>
              <div className="font-display text-6xl font-extrabold leading-none md:text-7xl">
                {kcal === null ? "–" : Math.round(kcal).toLocaleString()}
              </div>
              <div className="mt-1 text-sm text-muted">kcal, estimated</div>
            </div>
          </PlateRing>
        </div>
        <div>
          <h2 className="text-2xl font-bold">Your meal, estimated</h2>
          <p className="mt-2 text-muted">
            Portions are estimated from the photo. Nutrient values per 100 g come from the USDA FoodData Central database.
            This is not a laboratory result.
          </p>
          <p className="mt-4 text-[15px]">
            {confidence === null ? (
              <span className="rounded-full bg-leaf-50 px-3 py-1 font-medium text-leaf-700">Portions set by you</span>
            ) : (
              <span className="rounded-full bg-leaf-50 px-3 py-1 font-medium text-leaf-700">
                Recognition confidence: {confidenceLabel(confidence)}
              </span>
            )}
            <span className="ml-2 text-sm text-muted">The AI’s own rating, not a guarantee.</span>
          </p>
          {unmatched.length > 0 && (
            <p role="status" className="mt-4 rounded-xl bg-[#FFF8E6] p-3 text-sm">
              No database match for {unmatched.map((u) => `“${u.name}”`).join(", ")}. Its nutrients are shown as “Not available”
              and left out of the totals. Try a simpler name, like “chicken curry”.
            </p>
          )}
        </div>
      </section>

      <section aria-label="Macronutrients" className="grid gap-3 sm:grid-cols-3">
        {macros.map((m) => {
          const v = t[m.key];
          const share = v !== null && macroKcal > 0 ? Math.round(((v * m.kcalPer) / macroKcal) * 100) : null;
          return (
            <div key={m.key} className="card p-5">
              <div className="flex items-center gap-2 text-sm text-muted">
                <span className="h-3 w-3 rounded-full" style={{ background: m.color }} aria-hidden />
                {NUTRIENT_BY_KEY[m.key].label}
              </div>
              <div className="mt-2 font-display text-3xl font-bold">
                {v === null ? <span className="text-lg font-medium text-muted">Not available</span> : `${v.toLocaleString(undefined, { maximumFractionDigits: 1 })} g`}
              </div>
              {share !== null && <div className="mt-1 text-sm text-muted">{share}% of calories</div>}
            </div>
          );
        })}
      </section>

      <section className="card p-5 md:p-6">
        <h3 className="text-xl font-semibold">More detail</h3>
        <p className="text-sm text-muted">Bars show the share of a general adult daily reference (FDA Daily Values).</p>
        <div className="mt-2 divide-y divide-line">
          {(["saturatedFat", "fiber", "sugar", "sodium"] as NutrientKey[]).map((k) => (
            <NutrientRow key={k} k={k} n={t} partial={partial.has(k)} />
          ))}
        </div>
      </section>

      <section className="card p-5 md:p-6">
        <h3 className="text-xl font-semibold">Vitamins and minerals</h3>
        <p className="text-sm text-muted">Only values reported by the database are shown. Gaps are not filled with guesses.</p>
        <div className="mt-2 grid gap-x-10 md:grid-cols-2">
          {(["vitamin", "mineral"] as const).map((g) => (
            <div key={g} className="divide-y divide-line">
              <p className="pb-1 pt-3 text-sm font-semibold text-leaf-700">{g === "vitamin" ? "Vitamins" : "Minerals"}</p>
              {NUTRIENTS.filter((n) => n.group === g).map((n) => (
                <NutrientRow key={n.key} k={n.key} n={t} partial={partial.has(n.key)} />
              ))}
            </div>
          ))}
        </div>
      </section>

      <section aria-label="Food breakdown">
        <h3 className="mb-3 text-xl font-semibold">Food breakdown</h3>
        <div className="space-y-3">
          {data.items.map((it) => (
            <details key={it.id} className="card group p-5">
              <summary className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold">
                  {it.name} <span className="font-normal text-muted">· {it.grams} g</span>
                </span>
                <span className="text-[15px]">
                  <span className="font-semibold">{formatNutrient("calories", it.nutrients.calories)}</span>
                  <span className="ml-3 text-muted">
                    P {fmt1(it.nutrients.protein)} · C {fmt1(it.nutrients.carbs)} · F {fmt1(it.nutrients.fat)}
                  </span>
                </span>
              </summary>
              <div className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
                <p className="text-muted">
                  Portion: {portionSource[it.id] === "you" ? "set by you" : "estimated from the photo"}.{" "}
                  {it.match ? (
                    <>Nutrition from “{it.match.description}” ({it.match.dataType}, FDC {it.match.fdcId}).</>
                  ) : (
                    <>No database match found.</>
                  )}
                </p>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
                  {NUTRIENTS.map((n) => (
                    <div key={n.key} className="flex justify-between gap-2">
                      <dt className="text-muted">{n.label.replace(/ \(.*\)/, "")}</dt>
                      <dd className={it.nutrients[n.key] === null ? "text-muted" : ""}>
                        {it.nutrients[n.key] === null ? "n/a" : formatNutrient(n.key, it.nutrients[n.key], false)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </details>
          ))}
          {data.items.length > 1 && (
            <div className="flex items-baseline justify-between rounded-2xl bg-leaf-50 px-5 py-4">
              <span className="font-semibold">Meal total</span>
              <span className="font-display text-xl font-bold">{formatNutrient("calories", t.calories)}</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function fmt1(v: number | null) {
  return v === null ? "n/a" : `${v.toLocaleString(undefined, { maximumFractionDigits: 1 })} g`;
}
