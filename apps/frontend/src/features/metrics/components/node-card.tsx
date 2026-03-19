import { Cpu } from "lucide-react";
import type { NodeState } from "../types";
import { isActive, fmtLoss, fmtPct } from "../utils";

export function NodeCard({ node, maxBatch, totalEpochs }: { node: NodeState; maxBatch: number; totalEpochs: number | null }) {
  const active = isActive(node.lastTs);
  const batchPct = maxBatch > 0 ? Math.min((node.batch / maxBatch) * 100, 100) : 0;

  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-sm border relative overflow-hidden"
      style={{ background: "var(--surface-1)", borderColor: active ? "var(--border-active)" : "var(--border-subtle)" }}
    >
      {/* Top accent */}
      <div
        className="absolute top-0 left-0 right-0 h-px transition-opacity duration-500"
        style={{ background: "linear-gradient(90deg, transparent, var(--amber-primary), transparent)", opacity: active ? 0.5 : 0.1 }}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: active ? "#10b981" : "var(--text-secondary)", boxShadow: active ? "0 0 6px #10b981" : "none" }}
          />
          <span className="font-mono text-[11px] font-bold tracking-wider" style={{ color: "var(--text-primary)" }}>
            {node.label}
          </span>
        </div>
        <Cpu size={11} style={{ color: "var(--text-secondary)", opacity: 0.5 }} />
      </div>

      {/* Epoch + batch progress */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[9px] uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Epoch</span>
          <span className="font-mono text-[13px] font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
            {node.epoch}{totalEpochs ? ` / ${totalEpochs}` : ""}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: "var(--surface-3)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${batchPct}%`, background: "var(--amber-primary)", opacity: active ? 1 : 0.4 }}
            />
          </div>
          <div className="flex justify-between">
            <span className="font-mono text-[9px]" style={{ color: "var(--text-secondary)" }}>Batch</span>
            <span className="font-mono text-[9px] tabular-nums" style={{ color: "var(--text-secondary)" }}>
              {node.batch}{maxBatch > 0 ? ` / ${maxBatch}` : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--border-subtle)" }} />

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <MetricCell label="Train Loss" value={fmtLoss(node.trainLoss)} />
        <MetricCell label="Train Acc"  value={fmtPct(node.trainAccuracy)} accent />
        <MetricCell label="Eval Loss"  value={fmtLoss(node.evalLoss)} />
        <MetricCell label="Eval Acc"   value={fmtPct(node.evalAccuracy)} accent />
      </div>
    </div>
  );
}

export function MetricCell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[8px] uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>{label}</span>
      <span
        className="font-mono text-[13px] font-bold tabular-nums"
        style={{ color: accent ? "#10b981" : "var(--text-primary)" }}
      >
        {value}
      </span>
    </div>
  );
}
