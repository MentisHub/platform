import { NodesView } from "@/features/nodes/nodes-view";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function NodesPage({ params }: Props) {
  const { id } = await params;
  return <NodesView projectId={id} />;
}
