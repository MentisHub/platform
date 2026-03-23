import { MonitoringView } from "@/features/metrics/monitoring-view";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ run?: string }>;
}

export default async function MonitoringPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { run } = await searchParams;
  return <MonitoringView projectId={id} initialRunId={run} />;
}
