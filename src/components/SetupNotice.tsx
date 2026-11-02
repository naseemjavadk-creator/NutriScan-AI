export default function SetupNotice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div role="alert" className="rounded-2xl border border-carbs/40 bg-[#FFF8E6] p-5 text-[15px]">
      <p className="font-display text-lg font-semibold">{title}</p>
      <div className="mt-1 space-y-2 text-ink/90">{children}</div>
    </div>
  );
}
