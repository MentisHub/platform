import type { ServerState } from "../types";
import { fmtPct, fmtLoss } from "../utils";

export function ServerOverview({
  server,
  totalRounds,
  extraStats = [],
}: {
  server: ServerState;
  totalRounds: number | null;
  extraStats?: { label: string; value: string }[];
}) {
  const stats = [
    {
      label: "Round",
      value: totalRounds ? `${server.round} / ${totalRounds}` : String(server.round),
      big: true,
    },
    { label: "Agg. Accuracy", value: fmtPct(server.aggAccuracy), big: true, color: "#10b981" },
    { label: "Agg. Train Loss", value: fmtLoss(server.aggTrainLoss) },
    { label: "Agg. Eval Loss", value: fmtLoss(server.aggEvalLoss) },
    ...extraStats.map((s) => ({ label: s.label, value: s.value })),
  ];

  return (
    <div
      className="grid grid-cols-3 md:grid-cols-6 gap-px rounded-sm overflow-hidden border"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex flex-col gap-0.5 px-4 py-3"
          style={{ background: "var(--surface-1)" }}
        >
          <span
            className="font-mono text-[9px] tracking-[0.08em] uppercase"
            style={{ color: "var(--text-secondary)" }}
          >
            {s.label}
          </span>
          <span
            className={`font-mono tabular-nums font-bold ${s.big ? "text-[22px]" : "text-[15px]"}`}
            style={{ color: s.color ?? "var(--text-primary)", lineHeight: 1.1 }}
          >
            {s.value}
          </span>
        </div>
      ))}
    </div>
  );
}
