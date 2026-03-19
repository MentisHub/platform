export function RoundProgress({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex-1 h-1 rounded-full overflow-hidden"
        style={{ background: "var(--surface-3)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: "var(--amber-primary)" }}
        />
      </div>
      <span className="font-mono text-[9px] tabular-nums shrink-0" style={{ color: "var(--text-secondary)" }}>
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}
