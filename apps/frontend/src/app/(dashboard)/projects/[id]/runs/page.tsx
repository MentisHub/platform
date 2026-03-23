import { RunsView } from "@/features/training/runs-view";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RunsPage({ params }: Props) {
  const { id } = await params;
  return <RunsView projectId={id} />;
}
