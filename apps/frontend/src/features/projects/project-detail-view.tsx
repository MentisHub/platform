"use client";

import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useProject } from "./queries";
import { useCurrentOrg } from "@/features/organizations/use-current-org";
import { useTrainingRuns } from "@/features/training/queries";
import { useFabs } from "@/features/fabs/queries";
import { CreateTrainingDialog } from "@/features/training/components/create-training-dialog";
import { relativeTime } from "@/features/training/utils";
import { ActiveRunCard } from "./components/active-run-card";
import { RunOverviewRow } from "./components/run-overview-row";
import { NodeOverview, useNodeCount } from "./components/node-overview";
import { Activity, ArrowRight, Cpu, Package, Play, Plus } from "lucide-react";
import Link from "next/link";

interface ProjectDetailViewProps {
  projectId: string;
}

interface StatChipProps {
  label: string;
  value: string | number | undefined;
  loading: boolean;
}

function StatChip({ label, value, loading }: StatChipProps) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-mono text-[10px] tracking-[0.08em] uppercase" style={{ color: "var(--text-secondary)" }}>
        {label}
      </span>
      {loading ? (
        <Skeleton className="h-3.5 w-6 inline-block" />
      ) : (
        <span className="font-mono text-[13px] font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
          {value ?? "—"}
        </span>
      )}
    </div>
  );
}

export function ProjectDetailView({ projectId }: ProjectDetailViewProps) {
  const { org } = useCurrentOrg();
  const { data: project, isLoading } = useProject(org?.id, projectId);
  const { data: runs, isLoading: runsLoading } = useTrainingRuns(projectId);
  const { data: fabsData, isLoading: fabsLoading } = useFabs(org?.id ?? "");
  const { total: nodeCount, isLoading: nodesLoading } = useNodeCount(projectId);

  const activeRuns = runs?.filter((r) => r.status === "RUNNING" || r.status === "DEPLOYING") ?? [];
  const recentRuns = runs
    ?.slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8) ?? [];

  const completedCount = runs?.filter((r) => r.status === "COMPLETED").length ?? 0;
  const failedCount = runs?.filter((r) => r.status === "FAILED").length ?? 0;
  const totalFinished = completedCount + failedCount;
  const successRate = totalFinished > 0 ? Math.round((completedCount / totalFinished) * 100) : null;
  const successColor =
    successRate === null ? "var(--text-primary)"
    : successRate >= 70 ? "#10b981"
    : successRate >= 40 ? "var(--amber-primary)"
    : "#ef4444";

  return (
    <>
      <Header title={isLoading ? "…" : (project?.name ?? "Project")}>
        {!isLoading && (
          <CreateTrainingDialog projectId={projectId}>
            <Button size="sm">
              <Plus size={11} />
              New Run
            </Button>
          </CreateTrainingDialog>
        )}
      </Header>

      <div className="flex-1 p-5 flex flex-col gap-5 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-72" />
          </div>
        ) : (
          <>
            {/* Meta + inline stats */}
            <div className="flex items-center gap-4 flex-wrap">
              <span className="font-mono text-[10px]" style={{ color: "var(--text-secondary)" }}>
                {project?.id}
              </span>
              {project?.createdAt && (
                <span className="font-mono text-[10px]" style={{ color: "var(--text-secondary)" }}>
                  · created {relativeTime(project.createdAt)}
                </span>
              )}

              <div
                className="h-3 w-px mx-1"
                style={{ background: "var(--border-subtle)" }}
              />

              <StatChip label="Runs" value={runs?.length} loading={runsLoading} />
              <StatChip label="Nodes" value={nodeCount} loading={nodesLoading} />
              <StatChip label="FABs" value={fabsData?.meta.total} loading={fabsLoading} />
              {successRate !== null && (
                <div className="flex items-baseline gap-2">
                  <span
                    className="font-mono text-[10px] tracking-[0.08em] uppercase"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Success
                  </span>
                  <span
                    className="font-mono text-[13px] font-bold tabular-nums"
                    style={{ color: successColor }}
                  >
                    {successRate}%
                  </span>
                </div>
              )}
            </div>

            {/* Active runs */}
            {activeRuns.length > 0 && (
              <div className="flex flex-col gap-2">
                {activeRuns.map((run) => (
                  <ActiveRunCard key={run.id} run={run} projectId={projectId} />
                ))}
              </div>
            )}

            {/* Two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-5 flex-1">

              {/* Left: Recent runs */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span
                    className="font-mono text-[10px] tracking-[0.08em] uppercase"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Recent Runs
                  </span>
                  <Link
                    href={`/projects/${projectId}/runs`}
                    className="font-mono text-[10px] flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity"
                    style={{ color: "var(--amber-primary)" }}
                  >
                    View all <ArrowRight size={9} />
                  </Link>
                </div>

                {runsLoading && (
                  <div className="flex flex-col gap-1">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                )}

                {!runsLoading && recentRuns.length === 0 && (
                  <div
                    className="flex flex-col items-center justify-center py-16 gap-3 rounded-sm border"
                    style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}
                  >
                    <span
                      className="font-mono text-[10px] tracking-[0.08em] uppercase"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      No runs yet
                    </span>
                    <CreateTrainingDialog projectId={projectId}>
                      <Button variant="outline" size="sm">
                        <Plus size={11} />
                        Create first run
                      </Button>
                    </CreateTrainingDialog>
                  </div>
                )}

                {!runsLoading && recentRuns.length > 0 && (
                  <div
                    className="rounded-sm border px-4"
                    style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}
                  >
                    {recentRuns.map((run) => (
                      <RunOverviewRow key={run.id} run={run} projectId={projectId} />
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Quick links + node status */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  {(
                    [
                      { href: `/projects/${projectId}/runs`, icon: Play, label: "Runs", value: runs?.length, loading: runsLoading },
                      { href: `/projects/${projectId}/nodes`, icon: Cpu, label: "Nodes", value: nodeCount, loading: nodesLoading },
                      { href: `/projects/${projectId}/fabs`, icon: Package, label: "FABs", value: fabsData?.meta.total, loading: fabsLoading },
                      { href: `/projects/${projectId}/monitoring`, icon: Activity, label: "Monitoring", value: activeRuns.length > 0 ? "Live" : "—", loading: false },
                    ] as const
                  ).map(({ href, icon: Icon, label, value, loading }) => (
                    <Link
                      key={href}
                      href={href}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-sm border hover:bg-surface-2 transition-colors group"
                      style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}
                    >
                      <Icon size={12} style={{ color: "var(--amber-primary)" }} />
                      <span className="font-mono text-[11px] flex-1" style={{ color: "var(--text-secondary)" }}>
                        {label}
                      </span>
                      {loading ? (
                        <Skeleton className="h-3.5 w-6" />
                      ) : (
                        <span className="font-mono text-[12px] font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
                          {value ?? "—"}
                        </span>
                      )}
                      <ArrowRight
                        size={9}
                        className="opacity-0 group-hover:opacity-40 transition-opacity"
                        style={{ color: "var(--text-secondary)" }}
                      />
                    </Link>
                  ))}
                </div>

                <div className="flex flex-col gap-2">
                  <span
                    className="font-mono text-[10px] tracking-[0.08em] uppercase"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Node Status
                  </span>
                  <NodeOverview projectId={projectId} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
