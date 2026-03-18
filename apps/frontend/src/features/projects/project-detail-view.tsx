"use client";

import { usePushCrumb } from "@/components/layout/nav/breadcrumb/breadcrumb-context";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useProject } from "./queries";
import { useCurrentOrg } from "@/features/organizations/use-current-org";
import { ProjectDropdown } from "./project-dropdown";
import { useTrainingRuns } from "@/features/training/queries";
import { useFabs } from "@/features/fabs/queries";
import Link from "next/link";
import { Activity, Package, Play } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ── Stat tile ──────────────────────────────────────────────────────────────────

function StatTile({
  href,
  icon: Icon,
  label,
  value,
  loading,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  value: string | number | undefined;
  loading: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-3 p-4 rounded-sm border transition-colors hover:bg-surface-2"
      style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}
    >
      <div className="flex items-center gap-2">
        <Icon size={13} style={{ color: "var(--amber-primary)" }} />
        <span
          className="font-mono text-[10px] tracking-[0.06em] uppercase"
          style={{ color: "var(--text-secondary)" }}
        >
          {label}
        </span>
      </div>
      {loading ? (
        <Skeleton className="h-6 w-10" />
      ) : (
        <span
          className="font-mono font-bold text-[22px] leading-none tabular-nums"
          style={{ color: "var(--text-primary)" }}
        >
          {value ?? "—"}
        </span>
      )}
    </Link>
  );
}

// ── Main view ──────────────────────────────────────────────────────────────────

interface ProjectDetailViewProps {
  projectId: string;
}

export function ProjectDetailView({ projectId }: ProjectDetailViewProps) {
  const { org } = useCurrentOrg();
  const { data: project, isLoading } = useProject(org?.id, projectId);
  const { data: runs, isLoading: runsLoading } = useTrainingRuns(projectId);
  const { data: fabsData, isLoading: fabsLoading } = useFabs(org?.id ?? "");

  usePushCrumb(
    project
      ? { render: <ProjectDropdown projectId={project.id} label={project.name} /> }
      : null,
  );

  const runningCount = runs?.filter((r) => r.status === "RUNNING").length ?? 0;

  return (
    <>
      <Header title={isLoading ? "…" : (project?.name ?? "Project")} />

      <div className="flex-1 p-5 flex flex-col gap-5">
        {isLoading ? (
          <div className="max-w-2xl flex flex-col gap-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-72" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="font-mono text-[11px]"
                style={{ color: "var(--text-secondary)" }}
              >
                {project?.id}
              </span>
              {runningCount > 0 && (
                <Badge variant="amber" dot pulse>
                  {runningCount} running
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl">
              <StatTile
                href={`/projects/${projectId}/runs`}
                icon={Play}
                label="Training Runs"
                value={runs?.length}
                loading={runsLoading}
              />
              <StatTile
                href={`/projects/${projectId}/fabs`}
                icon={Package}
                label="FABs"
                value={fabsData?.meta.total}
                loading={fabsLoading}
              />
              <StatTile
                href={`/projects/${projectId}/monitoring`}
                icon={Activity}
                label="Monitoring"
                value={runningCount > 0 ? "Live" : "—"}
                loading={false}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}
