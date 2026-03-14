"use client";

import { usePushCrumb } from "@/components/layout/nav/breadcrumb/breadcrumb-context";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import { useProject } from "./queries";
import { useCurrentOrg } from "@/features/organizations/use-current-org";
import { ProjectDropdown } from "./project-dropdown";

interface ProjectDetailViewProps {
  projectId: string;
}

export function ProjectDetailView({ projectId }: ProjectDetailViewProps) {
  const { org } = useCurrentOrg();
  const { data: project, isLoading } = useProject(org?.id, projectId);

  usePushCrumb(
    project ? { render: <ProjectDropdown projectId={project.id} label={project.name} /> } : null,
  );

  return (
    <>
      <Header title={isLoading ? "…" : (project?.name ?? "Project")} />

      <div className="flex-1 p-5">
        {isLoading && (
          <div className="max-w-2xl flex flex-col gap-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-72" />
            <Skeleton className="h-3 w-60" />
          </div>
        )}

        {!isLoading && project && (
          <div className="max-w-2xl">
            <p className="font-mono text-[12px]" style={{ color: "var(--text-secondary)" }}>
              Project ID: {project.id}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
