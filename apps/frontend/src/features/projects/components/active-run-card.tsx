"use client";

import { Button } from "@/components/ui/button";
import { relativeTime } from "@/features/training/utils";
import type { TrainingRunResponse } from "@platform/contracts";
import { Activity } from "lucide-react";
import Link from "next/link";

interface ActiveRunCardProps {
  run: TrainingRunResponse;
  projectId: string;
}

export function ActiveRunCard({ run, projectId }: ActiveRunCardProps) {
  const isRunning = run.status === "RUNNING";

  return (
    <div
      className="relative flex items-center gap-4 px-5 py-3.5 rounded-sm border overflow-hidden"
      style={{
        background: "var(--surface-1)",
        borderColor: isRunning
          ? "color-mix(in srgb, var(--amber-primary) 50%, transparent)"
          : "color-mix(in srgb, #f59e0b 30%, transparent)",
        boxShadow: isRunning
          ? "inset 0 0 40px -20px color-mix(in srgb, var(--amber-primary) 8%, transparent)"
          : undefined,
      }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: "var(--amber-primary)", opacity: isRunning ? 1 : 0.5 }}
      />

      <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
        {isRunning && (
          <div
            className="absolute w-3 h-3 rounded-full animate-ping opacity-30"
            style={{ background: "var(--amber-primary)" }}
          />
        )}
        <div
          className="relative w-2 h-2 rounded-full"
          style={{ background: "var(--amber-primary)", opacity: isRunning ? 1 : 0.6 }}
        />
      </div>

      <span
        className="font-mono text-[10px] tracking-[0.12em] font-bold shrink-0"
        style={{ color: "var(--amber-primary)" }}
      >
        {run.status}
      </span>

      <span
        className="font-mono text-[12px] tabular-nums shrink-0"
        style={{ color: "var(--text-primary)" }}
      >
        {run.id.slice(0, 8)}
      </span>

      {run.startedAt && (
        <span className="font-mono text-[10px]" style={{ color: "var(--text-secondary)" }}>
          · started {relativeTime(run.startedAt)}
        </span>
      )}

      <div className="flex-1" />

      {run.startedAt && (
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/projects/${projectId}/monitoring?run=${run.id}`}>
            <Activity size={11} />
            Monitor
          </Link>
        </Button>
      )}
    </div>
  );
}
