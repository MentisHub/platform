import { ProjectSettingsView } from "@/features/projects/project-settings-view";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectSettingsPage({ params }: Props) {
  const { id } = await params;
  return <ProjectSettingsView projectId={id} />;
}
