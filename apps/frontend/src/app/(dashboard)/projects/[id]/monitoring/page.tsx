import { MonitoringView } from "@/features/metrics/monitoring-view";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MonitoringPage({ params }: Props) {
  const { id } = await params;
  return <MonitoringView projectId={id} />;
}
