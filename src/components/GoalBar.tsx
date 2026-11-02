export default function GoalBar({ label, value, goal, unit, color }: { label: string; value: number; goal: number; unit: string; color: string }) {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-sm text-muted">
        <span className="h-3 w-3 rounded-full" style={{ background: color }} aria-hidden />
        {label}
      </div>
      <p className="mt-2">
        <span className="font-display text-3xl font-bold">{Math.round(value)}</span>
        <span className="text-muted"> / {goal} {unit}</span>
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-leaf-50" role="progressbar" aria-label={`${label} progress`} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={goal}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
