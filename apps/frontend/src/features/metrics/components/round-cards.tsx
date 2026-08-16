"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { getPageNumbers } from "@/lib/utils";
import type { RoundMetrics } from "../types";
import { stripPrefix, fmtPct, fmtLoss, fmtNum } from "../utils";

const PAGE_SIZE = 8;

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
      className="relative flex w-full min-w-0 flex-col gap-2.5 overflow-hidden rounded-sm border p-3 transition-colors"
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
  const descending = useMemo(() => [...rounds].reverse(), [rounds]);
  const totalPages = Math.ceil(descending.length / PAGE_SIZE);
  const activePage = Math.max(1, Math.min(page, totalPages || 1));

  if (rounds.length === 0) return null;

  const visible = descending.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE);
  const firstVisible = (activePage - 1) * PAGE_SIZE + 1;
  const lastVisible = Math.min(activePage * PAGE_SIZE, descending.length);

  return (
    <div className="flex flex-col gap-2.5">
      <div
        key={activePage}
        className="grid grid-cols-1 gap-2 pb-1 transition-all duration-300 ease-out motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8"
      >
        {visible.map((r) => (
          <RoundCard key={r.round} data={r} isCurrent={r.round === currentRound} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-[9px] uppercase tabular-nums" style={{ color: "var(--text-secondary)" }}>
            {firstVisible}-{lastVisible} / {descending.length}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Previous rounds"
              disabled={activePage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex size-7 items-center justify-center rounded-sm border transition-colors disabled:cursor-not-allowed disabled:opacity-30"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}
            >
              <ChevronLeft className="size-3.5" />
            </button>
            {getPageNumbers(activePage, totalPages).map((p, i) =>
              p === "…" ? (
                <span key={`ellipsis-${i}`} className="px-1 font-mono text-[10px]" style={{ color: "var(--text-secondary)", opacity: 0.4 }}>
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className="h-7 min-w-7 rounded-sm border px-2 font-mono text-[10px] tabular-nums transition-colors"
                  style={{
                    background: p === activePage ? "var(--surface-2)" : "transparent",
                    borderColor: p === activePage ? "var(--amber-primary)" : "var(--border-subtle)",
                    color: p === activePage ? "var(--amber-primary)" : "var(--text-secondary)",
                    opacity: p === activePage ? 1 : 0.65,
                  }}
                >
                  {p}
                </button>
              ),
            )}
            <button
              type="button"
              aria-label="Next rounds"
              disabled={activePage === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="flex size-7 items-center justify-center rounded-sm border transition-colors disabled:cursor-not-allowed disabled:opacity-30"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
