"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentOrg } from "@/features/organizations/use-current-org";
import { Plus } from "lucide-react";
import { ProjectCard } from "./components/project-card";
import { useProjects } from "./queries";

function ProjectCardSkeleton() {
  return (
    <div
      className="flex flex-col rounded-md border overflow-hidden"
      style={{ background: "var(--surface-1)", borderColor: "var(--border-subtle)" }}
    >
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function ProjectsView() {
  const { org, isLoading: orgLoading } = useCurrentOrg();
  const { data, isLoading, isError } = useProjects(org?.id);

  const loading = orgLoading || isLoading;

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <div
          className="flex items-center gap-2 h-8 px-3 rounded-sm border border-border-subtle flex-1 max-w-xs"
          style={{ background: "var(--surface-1)" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <span className="font-mono text-[11px] tracking-[0.05em]" style={{ color: "var(--text-secondary)" }}>
            Search for a project
          </span>
        </div>

        <div className="flex-1" />

        <div
          className="flex items-center rounded-sm border border-border-subtle overflow-hidden"
          style={{ background: "var(--surface-1)" }}
        >
        </div>

        <Button variant="default" className="py-1.5 px-3 gap-1.5 text-[11px]">
          <Plus size={13} />
          New Project
        </Button>
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!loading && isError && (
        <div
          className="flex items-center justify-center py-24 font-mono text-[12px] tracking-[0.08em]"
          style={{ color: "var(--text-secondary)" }}
        >
          Failed to load projects.
        </div>
      )}

      {!loading && !isError && data?.data.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-24 gap-3 font-mono text-[12px] tracking-[0.08em] uppercase"
          style={{ color: "var(--text-secondary)" }}
        >
          <span>No projects yet</span>
          <Button variant="secondary" className="py-2 text-[11px]">
            <Plus size={12} />
            Create your first project
          </Button>
        </div>
      )}

      {!loading && data && data.data.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.data.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </>
  );
}
