"use client";

import { usePushCrumb } from "@/components/layout/nav/breadcrumb/breadcrumb-context";
import { useProject } from "../queries";
import { useCurrentOrg } from "@/features/organizations/use-current-org";
import { ProjectDropdown } from "./project-dropdown";

export function ProjectCrumb({ projectId }: { projectId: string }) {
  const { org } = useCurrentOrg();
  const { data: project } = useProject(org?.id, projectId);

  usePushCrumb(
    project
      ? { render: <ProjectDropdown projectId={project.id} label={project.name} /> }
      : { label: "…" },
  );

  return null;
}
