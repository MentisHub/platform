import { ProjectDetailView } from "@/features/projects/project-detail-view";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: Props) {
  const { id } = await params;
  return <ProjectDetailView projectId={id} />;
}
