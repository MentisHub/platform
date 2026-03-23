"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDeployTraining, useRunTraining } from "../queries";
import { statusVariant, relativeTime, STATUS_COLOR } from "../utils";
import type { TrainingRunResponse } from "@platform/contracts";
import { Activity, Play, Rocket } from "lucide-react";
import Link from "next/link";

function timestamp(run: TrainingRunResponse): { label: string; iso: string } {
  if (run.completedAt) return { label: `completed ${relativeTime(run.completedAt)}`, iso: run.completedAt };
  if (run.startedAt)   return { label: `started ${relativeTime(run.startedAt)}`,     iso: run.startedAt };
  return                      { label: `created ${relativeTime(run.createdAt)}`,      iso: run.createdAt };
}

function cfgVal(cfg: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) if (cfg[k] != null) return cfg[k];
  return null;
}

function RunConfig({ cfg }: { cfg: Record<string, unknown> }) {
  const rounds   = cfgVal(cfg, "num_rounds", "num-rounds");
  const minNodes = cfgVal(cfg, "min_available_clients", "min-available-clients");
  if (!rounds && !minNodes) return null;
  return (
    <span className="font-mono text-[10px] shrink-0" style={{ color: "var(--text-secondary)" }}>
      {[
        rounds   ? `${rounds} rounds`  : null,
        minNodes ? `min ${minNodes} nodes` : null,
      ].filter(Boolean).join(" · ")}
    </span>
  );
}

function NodeRequirement({
  cfg,
  readyCount,
}: {
  cfg: Record<string, unknown>;
  readyCount: number;
}) {
  const min = Number(cfgVal(cfg, "min_available_clients", "min-available-clients") ?? 0);
  if (!min) return null;
  const ok = readyCount >= min;
  return (
    <span
      className="font-mono text-[10px] tabular-nums shrink-0"
      style={{ color: ok ? "#10b981" : "#ef4444" }}
      title={ok ? "Enough nodes available" : `Need ${min} ready nodes, have ${readyCount}`}
    >
      {readyCount}/{min} nodes
    </span>
  );
}

interface RunRowProps {
  run: TrainingRunResponse;
  projectId?: string;
  readyNodeCount?: number;
}

export function RunRow({ run, projectId, readyNodeCount = 0 }: RunRowProps) {
  const deploy      = useDeployTraining(projectId ?? "");
  const runTraining = useRunTraining(projectId ?? "");
  const isActive    = run.status === "RUNNING" || run.status === "DEPLOYING";
  const showActions = !!projectId;
  const { label: tsLabel, iso: tsIso } = timestamp(run);
  const cfg = run.configuration as Record<string, unknown> | null | undefined;

  return (
    <div
      className="flex items-center gap-4 px-4 py-3 rounded-sm border relative overflow-hidden"
      style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}
    >
      {isActive && (
        <div
          className="absolute left-0 top-0 bottom-0 w-0.5 animate-pulse"
          style={{ background: STATUS_COLOR.RUNNING }}
        />
      )}

      <span
        className="font-mono text-[11px] tabular-nums shrink-0 w-[72px]"
        style={{ color: "var(--text-primary)" }}
      >
        {run.id.slice(0, 8)}
      </span>

      <Badge variant={statusVariant(run.status)} dot pulse={isActive}>
        {run.status}
      </Badge>

      <span
        className="font-mono text-[10px] shrink-0"
        style={{ color: "var(--text-secondary)" }}
        title={new Date(tsIso).toLocaleString()}
      >
        {tsLabel}
      </span>

      {cfg && <RunConfig cfg={cfg} />}

      <div className="flex-1" />

      {run.status === "PENDING" && cfg && (
        <NodeRequirement cfg={cfg} readyCount={readyNodeCount} />
      )}

      {showActions && (
        <div className="shrink-0 flex items-center gap-2">
          {run.status === "PENDING" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => deploy.mutate(run.id)}
              disabled={deploy.isPending}
            >
              <Rocket size={11} />
              Deploy
            </Button>
          )}
          {run.status === "READY" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => runTraining.mutate(run.id)}
              disabled={runTraining.isPending}
            >
              <Play size={11} />
              Run
            </Button>
          )}
          {run.startedAt && (
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/projects/${projectId}/monitoring?run=${run.id}`}>
                <Activity size={11} />
                Monitor
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
