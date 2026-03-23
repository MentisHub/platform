"use client";

import { useState } from "react";
import { getPageNumbers } from "@/lib/utils";
import type { RoundMetrics } from "../types";
import { stripPrefix, fmtPct, fmtLoss, fmtNum } from "../utils";

const PAGE_SIZE = 10;

export function buildRoundMetrics(
  series: { metric: Record<string, string>; values: [number, string][] }[],
): RoundMetrics[] {
  const roundSeries     = series.find((s) => stripPrefix(s.metric.__name__ ?? "") === "fl_server_round_current"          && !s.metric.node_id);
  const accSeries       = series.find((s) => stripPrefix(s.metric.__name__ ?? "") === "fl_server_aggregated_accuracy"    && !s.metric.node_id);
  const trainLossSeries = series.find((s) => stripPrefix(s.metric.__name__ ?? "") === "fl_server_aggregated_train_loss"  && !s.metric.node_id);
  const evalLossSeries  = series.find((s) => stripPrefix(s.metric.__name__ ?? "") === "fl_server_aggregated_eval_loss"   && !s.metric.node_id);
  const examplesSeries  = series.find((s) => stripPrefix(s.metric.__name__ ?? "") === "fl_server_train_examples_total"   && !s.metric.node_id);

  if (!roundSeries) return [];

  const lookup = (s: typeof accSeries) => {
    const m = new Map<number, number>();
    for (const [t, v] of s?.values ?? []) { const n = parseFloat(v); if (Number.isFinite(n)) m.set(t, n); }
    return m;
  };
  const accMap       = lookup(accSeries);
  const trainLossMap = lookup(trainLossSeries);
  const evalLossMap  = lookup(evalLossSeries);
  const examplesMap  = lookup(examplesSeries);

  const roundMap = new Map<number, RoundMetrics>();
  for (const [ts, val] of roundSeries.values) {
    const round = Math.round(parseFloat(val));
    if (!Number.isFinite(round) || round <= 0) continue;
    const get = (m: Map<number, number>) => m.get(ts) ?? null;
    roundMap.set(round, {
      round,
      acc:           get(accMap),
      trainLoss:     get(trainLossMap),
      evalLoss:      get(evalLossMap),
      trainExamples: get(examplesMap),
    });
  }

  return Array.from(roundMap.values()).sort((a, b) => a.round - b.round);
}

function RoundCard({ data, isCurrent }: { data: RoundMetrics; isCurrent: boolean }) {
  return (
    <div
      className="flex flex-col gap-2.5 p-3 rounded-sm border shrink-0 w-40 relative overflow-hidden transition-colors"
      style={{
        background: "var(--surface-1)",
        borderColor: isCurrent ? "var(--amber-primary)" : "var(--border-subtle)",
      }}
    >
      {isCurrent && (
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, var(--amber-primary), transparent)" }}
        />
      )}
      <div className="flex items-center justify-between">
        <span className="font-mono text-[8px] uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Round</span>
        <span
          className="font-mono text-[18px] font-bold tabular-nums leading-none"
          style={{ color: isCurrent ? "var(--amber-primary)" : "var(--text-primary)" }}
        >
          {data.round}
        </span>
      </div>
      <div style={{ height: 1, background: "var(--border-subtle)" }} />
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-baseline">
          <span className="font-mono text-[8px] uppercase" style={{ color: "var(--text-secondary)" }}>Accuracy</span>
          <span className="font-mono text-[11px] font-bold" style={{ color: "#10b981" }}>{fmtPct(data.acc)}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="font-mono text-[8px] uppercase" style={{ color: "var(--text-secondary)" }}>Train loss</span>
          <span className="font-mono text-[11px] tabular-nums" style={{ color: "var(--text-primary)" }}>{fmtLoss(data.trainLoss)}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="font-mono text-[8px] uppercase" style={{ color: "var(--text-secondary)" }}>Eval loss</span>
          <span className="font-mono text-[11px] tabular-nums" style={{ color: "var(--text-primary)" }}>{fmtLoss(data.evalLoss)}</span>
        </div>
        {data.trainExamples !== null && (
          <div className="flex justify-between items-baseline">
            <span className="font-mono text-[8px] uppercase" style={{ color: "var(--text-secondary)" }}>Examples</span>
            <span className="font-mono text-[11px] tabular-nums" style={{ color: "var(--text-primary)" }}>{fmtNum(data.trainExamples)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function RoundCardsStrip({ rounds, currentRound }: { rounds: RoundMetrics[]; currentRound: number }) {
  const [page, setPage] = useState(1);
  if (rounds.length === 0) return null;

  const descending = [...rounds].reverse();
  const totalPages = Math.ceil(descending.length / PAGE_SIZE);
  const visible = descending.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 pb-1" style={{ scrollbarWidth: "none" }}>
        {visible.map((r) => (
          <RoundCard key={r.round} data={r} isCurrent={r.round === currentRound} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2.5">
          {getPageNumbers(page, totalPages).map((p, i) =>
            p === "…" ? (
              <span key={`ellipsis-${i}`} className="font-mono text-[10px]" style={{ color: "var(--text-secondary)", opacity: 0.4 }}>
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p)}
                className="font-mono text-[10px] tabular-nums transition-colors"
                style={{ color: p === page ? "var(--amber-primary)" : "var(--text-secondary)", opacity: p === page ? 1 : 0.5 }}
              >
                {p}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
