import { ProjectFabsView } from "@/features/fabs/project-fabs-view";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function FabsPage({ params }: Props) {
  const { id } = await params;
  return <ProjectFabsView projectId={id} />;
}
