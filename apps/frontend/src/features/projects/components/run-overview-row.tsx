import { Badge } from "@/components/ui/badge";
import { relativeTime, STATUS_COLOR, statusVariant } from "@/features/training/utils";
import type { TrainingRunResponse } from "@platform/contracts";
import Link from "next/link";

interface RunOverviewRowProps {
  run: TrainingRunResponse;
  projectId: string;
}

export function RunOverviewRow({ run, projectId }: RunOverviewRowProps) {
  const isActive = run.status === "RUNNING" || run.status === "DEPLOYING";
  const ts = run.completedAt
    ? relativeTime(run.completedAt)
    : run.startedAt
      ? relativeTime(run.startedAt)
      : relativeTime(run.createdAt);

  return (
    <Link
      href={`/projects/${projectId}/runs`}
      className="flex items-center gap-3 py-2.5 border-b last:border-b-0 -mx-4 px-4 hover:bg-surface-2 transition-colors"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? "animate-pulse" : ""}`}
        style={{ background: STATUS_COLOR[run.status] ?? "var(--text-secondary)" }}
      />
      <span
        className="font-mono text-[11px] tabular-nums w-[68px] shrink-0"
        style={{ color: "var(--text-primary)" }}
      >
        {run.id.slice(0, 8)}
      </span>
      <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
      <div className="flex-1" />
      <span className="font-mono text-[10px]" style={{ color: "var(--text-secondary)" }}>
        {ts}
      </span>
    </Link>
  );
}
