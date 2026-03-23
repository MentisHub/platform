"use client";

import Link from "next/link";
import { useNodes } from "@/features/nodes/queries";
import { useCurrentOrg } from "@/features/organizations/use-current-org";
import { NODE_STATUS_GROUPS } from "@/features/nodes/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface NodeStatusBarProps {
  projectId: string;
}

export function NodeStatusBar({ projectId }: NodeStatusBarProps) {
  const { org } = useCurrentOrg();
  const { data, isLoading } = useNodes(org?.id ?? "", { projectId, limit: 100 });

  const nodes = data?.data ?? [];

  if (isLoading) return <Skeleton className="h-5 w-48" />;
  if (nodes.length === 0) return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px]" style={{ color: "var(--text-secondary)" }}>
        No nodes assigned to this project —{" "}
        <Link
          href={`/projects/${projectId}/nodes`}
          className="underline underline-offset-2 hover:opacity-70 transition-opacity"
          style={{ color: "var(--amber-primary)" }}
        >
          add nodes
        </Link>
      </span>
    </div>
  );

  const groups = NODE_STATUS_GROUPS.map((g) => ({
    ...g,
    count: nodes.filter((n) => g.statuses.includes(n.status as never)).length,
  })).filter((g) => g.count > 0);

  return (
    <div className="flex items-center gap-4 flex-wrap">
      {groups.map((g) => (
        <div key={g.label} className="flex items-center gap-1.5">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: g.color }}
          />
          <span className="font-mono text-[10px]" style={{ color: "var(--text-secondary)" }}>
            {g.count} {g.label}
          </span>
        </div>
      ))}
      <Link
        href={`/projects/${projectId}/nodes`}
        className="font-mono text-[10px] transition-opacity hover:opacity-70 ml-auto"
        style={{ color: "var(--amber-primary)" }}
      >
        Manage nodes →
      </Link>
    </div>
  );
}

export function useReadyNodeCount(projectId: string): number {
  const { org } = useCurrentOrg();
  const { data } = useNodes(org?.id ?? "", { projectId, limit: 100 });
  return data?.data.filter((n) => n.status === "READY" || n.status === "TRAINING").length ?? 0;
}
