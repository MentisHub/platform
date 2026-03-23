"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useNodes } from "@/features/nodes/queries";
import { useCurrentOrg } from "@/features/organizations/use-current-org";
import { NODE_STATUS_GROUPS } from "@/features/nodes/utils";

interface NodeOverviewProps {
  projectId: string;
}

export function NodeOverview({ projectId }: NodeOverviewProps) {
  const { org } = useCurrentOrg();
  const { data, isLoading } = useNodes(org?.id ?? "", { projectId, limit: 100 });

  if (isLoading) return <Skeleton className="h-5 w-48" />;

  const nodes = data?.data ?? [];

  if (nodes.length === 0) {
    return (
      <span className="font-mono text-[10px]" style={{ color: "var(--text-secondary)" }}>
        No nodes assigned
      </span>
    );
  }

  const groups = NODE_STATUS_GROUPS.map((g) => ({
    ...g,
    count: nodes.filter((n) => g.statuses.includes(n.status as never)).length,
  })).filter((g) => g.count > 0);

  return (
    <div
      className="flex flex-wrap gap-x-5 gap-y-2 p-4 rounded-sm border"
      style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}
    >
      {groups.map((g) => (
        <div key={g.label} className="flex items-center gap-1.5">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: g.color }}
          />
          <span className="font-mono text-[11px]" style={{ color: "var(--text-secondary)" }}>
            {g.count}
          </span>
          <span className="font-mono text-[10px]" style={{ color: "var(--text-secondary)" }}>
            {g.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function useNodeCount(projectId: string): { total: number; isLoading: boolean } {
  const { org } = useCurrentOrg();
  const { data, isLoading } = useNodes(org?.id ?? "", { projectId, limit: 1 });
  return { total: data?.meta.total ?? 0, isLoading };
}
