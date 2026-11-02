/** A donut showing where a meal's calories come from: protein, carbs and fat. */
export default function PlateRing({
  protein,
  carbs,
  fat,
  size = 220,
  children,
}: {
  protein: number;
  carbs: number;
  fat: number;
  size?: number;
  children?: React.ReactNode;
}) {
  const parts = [
    { label: "Protein", kcal: protein * 4, color: "#2F9E5B" },
    { label: "Carbs", kcal: carbs * 4, color: "#E3A21A" },
    { label: "Fat", kcal: fat * 9, color: "#E2694F" },
  ];
  const total = parts.reduce((s, p) => s + p.kcal, 0);
  const r = 84;
  const c = 2 * Math.PI * r;
  const gap = total > 0 ? 7 : 0;
  let offset = 0;

  const summary = total
    ? parts.map((p) => `${p.label} ${Math.round((p.kcal / total) * 100)}%`).join(", ")
    : "No macronutrient data";

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={`Calories by source: ${summary}`}>
        <circle cx="100" cy="100" r={r} fill="none" stroke="#E4E8DE" strokeWidth="18" />
        {total > 0 &&
          parts.map((p) => {
            const share = (p.kcal / total) * c;
            const len = Math.max(0, share - gap);
            const el =
              len > 0 ? (
                <circle
                  key={p.label}
                  cx="100"
                  cy="100"
                  r={r}
                  fill="none"
                  stroke={p.color}
                  strokeWidth="18"
                  strokeLinecap="round"
                  strokeDasharray={`${len} ${c - len}`}
                  strokeDashoffset={-offset}
                  transform="rotate(-90 100 100)"
                />
              ) : null;
            offset += share;
            return el;
          })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
