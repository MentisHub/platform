"use client";

import { usePushCrumb } from "@/components/layout/nav/breadcrumb/breadcrumb-context";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { type ChartConfig } from "@/components/ui/chart";
import { useTrainingRuns } from "@/features/training/queries";
import { useNodes } from "@/features/nodes/queries";
import { useCurrentOrg } from "@/features/organizations/use-current-org";
import { useMetricsStream } from "./hooks/use-metrics-stream";
import { metricsApi } from "./api";
import { useQuery } from "@tanstack/react-query";
import type { TrainingRunResponse } from "@platform/contracts";
import { WifiOff } from "lucide-react";
import { useState, useMemo } from "react";
import { useLiveMetrics } from "./hooks/use-live-metrics";
import { stripPrefix } from "./utils";
import { ServerOverview } from "./components/server-overview";
import { RoundProgress } from "./components/round-progress";
import { NodeCard } from "./components/node-card";
import { TrendChart, type RoundMarker } from "./components/trend-chart";
import { buildRoundMetrics, RoundCardsStrip } from "./components/round-cards";
import { EmptyState } from "./components/empty-state";
import { RunSelector } from "./components/run-selector";

// ── Main view ──────────────────────────────────────────────────────────────────

interface MonitoringViewProps {
  projectId: string;
}

export function MonitoringView({ projectId }: MonitoringViewProps) {
  usePushCrumb({ label: "Monitoring" });

  const [selectedRunId, setSelectedRunId] = useState<string | undefined>();

  const { org } = useCurrentOrg();
  const { data: runs, isLoading: runsLoading } = useTrainingRuns(projectId);
  const { data: nodesData } = useNodes(org?.id ?? "", { projectId });

  const nodeNameMap = useMemo<Map<string, string>>(() => {
    const m = new Map<string, string>();
    for (const node of nodesData?.data ?? []) {
      if (node.flowerNodeId) m.set(node.flowerNodeId, node.name);
    }
    return m;
  }, [nodesData]);

  const activeRunId = selectedRunId ?? runs?.[0]?.id;
  const activeRun = runs?.find((r) => r.id === activeRunId) as
    | TrainingRunResponse
    | undefined;

  const cfg = activeRun?.configuration as
    | Record<string, unknown>
    | null
    | undefined;
  const totalRounds = cfg?.["num-rounds"] ? Number(cfg["num-rounds"]) : null;
  const totalEpochs = cfg?.["num-epochs"] ? Number(cfg["num-epochs"]) : null;

  const { event, connected } = useMetricsStream(projectId, activeRunId);
  const { live, rev: liveRev } = useLiveMetrics(event, nodeNameMap);

  const { data: rangeData, isLoading: rangeLoading } = useQuery({
    queryKey: ["metrics", "range", projectId, activeRunId],
    queryFn: () =>
      metricsApi.range(projectId, { trainingRunId: activeRunId, step: "1m" }),
    enabled: !!activeRunId,
    refetchInterval: false,
    staleTime: 30_000,
  });

  const nodes = useMemo(
    () =>
      Array.from(live.nodes.values()).sort((a, b) =>
        a.label.localeCompare(b.label),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [liveRev],
  );
  const hasLiveData = live.nodes.size > 0 || live.server.round > 0;

  const roundMetrics = useMemo(
    () => buildRoundMetrics(rangeData?.series ?? []),
    [rangeData],
  );
  const currentRound = hasLiveData
    ? live.server.round
    : (roundMetrics[roundMetrics.length - 1]?.round ?? 0);

  const roundMarkers = useMemo<RoundMarker[]>(() => {
    const roundSeries = (rangeData?.series ?? []).find(
      (s) =>
        stripPrefix(s.metric.__name__ ?? "") === "fl_server_round_current" &&
        !s.metric.node_id,
    );
    if (!roundSeries) return [];
    const seen = new Map<number, number>();
    for (const [t, v] of roundSeries.values) {
      const round = Math.round(parseFloat(v));
      if (!Number.isFinite(round) || round <= 0) continue;
      if (!seen.has(round)) seen.set(round, t);
    }
    return Array.from(seen.entries())
      .map(([round, t]) => ({ round, t }))
      .sort((a, b) => a.round - b.round);
  }, [rangeData]);

  const accuracyData = useMemo(() => {
    const historical = (rangeData?.series ?? [])
      .filter(
        (s) =>
          stripPrefix(s.metric.__name__ ?? "") ===
            "fl_server_aggregated_accuracy" && !s.metric.node_id,
      )
      .flatMap((s) =>
        s.values.map(([t, v]) => ({ t, accuracy: parseFloat(v) })),
      )
      .filter((p) => Number.isFinite(p.accuracy));
    const live_ = live.history.map((h) => ({
      t: h.t,
      accuracy: h.aggAccuracy,
    }));
    const merged = new Map<number, { t: number; accuracy: number | null }>();
    for (const p of historical) merged.set(p.t, p);
    for (const p of live_)
      if (p.accuracy !== null)
        merged.set(p.t, { t: p.t, accuracy: p.accuracy });
    return Array.from(merged.values()).sort((a, b) => a.t - b.t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeData, liveRev]);

  const lossData = useMemo(() => {
    const aggTrainSeries = (rangeData?.series ?? []).find(
      (s) =>
        stripPrefix(s.metric.__name__ ?? "") ===
          "fl_server_aggregated_train_loss" && !s.metric.node_id,
    );
    const aggEvalSeries = (rangeData?.series ?? []).find(
      (s) =>
        stripPrefix(s.metric.__name__ ?? "") ===
          "fl_server_aggregated_eval_loss" && !s.metric.node_id,
    );
    const tsMap = new Map<
      number,
      { t: number; trainLoss: number | null; evalLoss: number | null }
    >();
    for (const [t, v] of aggTrainSeries?.values ?? []) {
      const n = parseFloat(v);
      if (Number.isFinite(n)) tsMap.set(t, { t, trainLoss: n, evalLoss: null });
    }
    for (const [t, v] of aggEvalSeries?.values ?? []) {
      const n = parseFloat(v);
      if (Number.isFinite(n)) {
        const e = tsMap.get(t) ?? { t, trainLoss: null, evalLoss: null };
        e.evalLoss = n;
        tsMap.set(t, e);
      }
    }
    for (const h of live.history) {
      if (h.aggTrainLoss !== null || h.aggEvalLoss !== null) {
        tsMap.set(h.t, {
          t: h.t,
          trainLoss: h.aggTrainLoss,
          evalLoss: h.aggEvalLoss,
        });
      }
    }
    return Array.from(tsMap.values()).sort((a, b) => a.t - b.t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeData, liveRev]);

  const accuracyConfig: ChartConfig = {
    accuracy: { label: "Agg. Accuracy", color: "#10b981" },
  };
  const lossConfig: ChartConfig = {
    trainLoss: { label: "Train Loss", color: "var(--amber-primary)" },
    evalLoss: { label: "Eval Loss", color: "#f97316" },
  };

  const NODE_COLORS = [
    "var(--amber-primary)",
    "#10b981",
    "#a78bfa",
    "#38bdf8",
    "#f97316",
    "#fb7185",
  ];

  const buildNodeSeries = useMemo(
    () => (metricName: string) => {
      const series = (rangeData?.series ?? []).filter(
        (s) =>
          stripPrefix(s.metric.__name__ ?? "") === metricName &&
          s.metric.node_id,
      );
      if (series.length === 0)
        return {
          data: [],
          lines: [] as { key: string; color: string }[],
          config: {} as ChartConfig,
        };
      const nodeIds = Array.from(new Set(series.map((s) => s.metric.node_id)));
      const tsMap = new Map<number, Record<string, number>>();
      for (const s of series) {
        const nid = s.metric.node_id;
        const key = `node_${nid.slice(-6)}`;
        for (const [t, v] of s.values) {
          const n = parseFloat(v);
          if (!Number.isFinite(n)) continue;
          const entry = tsMap.get(t) ?? {};
          entry[key] = n;
          tsMap.set(t, entry);
        }
      }
      const data = Array.from(tsMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([t, v]) => ({ t, ...v }));
      const lines = nodeIds.map((nid, i) => ({
        key: `node_${nid.slice(-6)}`,
        color: NODE_COLORS[i % NODE_COLORS.length],
      }));
      const config: ChartConfig = Object.fromEntries(
        nodeIds.map((nid, i) => {
          const key = `node_${nid.slice(-6)}`;
          const label = nodeNameMap.get(nid) ?? `node-${nid.slice(-6)}`;
          return [key, { label, color: NODE_COLORS[i % NODE_COLORS.length] }];
        }),
      );
      return { data, lines, config };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [rangeData, nodeNameMap],
  );

  const clientTrainLoss = useMemo(
    () => buildNodeSeries("fl_client_train_loss"),
    [buildNodeSeries],
  );
  const clientEvalLoss = useMemo(
    () => buildNodeSeries("fl_client_eval_loss"),
    [buildNodeSeries],
  );
  const clientTrainAcc = useMemo(
    () => buildNodeSeries("fl_client_train_accuracy"),
    [buildNodeSeries],
  );
  const clientEvalAcc = useMemo(
    () => buildNodeSeries("fl_client_eval_accuracy"),
    [buildNodeSeries],
  );
  const clientTrainDuration = useMemo(
    () => buildNodeSeries("fl_client_train_duration_seconds_sum"),
    [buildNodeSeries],
  );
  const clientEvalDuration = useMemo(
    () => buildNodeSeries("fl_client_eval_duration_seconds_sum"),
    [buildNodeSeries],
  );

  const hasClientCharts =
    clientTrainLoss.data.length >= 2 || clientTrainAcc.data.length >= 2;
  const hasRuns = (runs?.length ?? 0) > 0;

  return (
    <>
      <Header title="Monitoring">
        {connected && (
          <Badge variant="success" dot pulse>
            Live
          </Badge>
        )}
      </Header>

      <div className="flex-1 p-5 flex flex-col gap-4 min-h-0 overflow-y-auto">
        {runsLoading ? (
          <Skeleton className="h-8 w-48" />
        ) : !hasRuns ? (
          <EmptyState projectId={projectId} />
        ) : (
          <>
            <RunSelector
              runs={runs}
              activeRunId={activeRunId}
              activeRun={activeRun}
              onRunChange={setSelectedRunId}
            />

            {/* Live — server overview + node cards (only when streaming) */}
            {hasLiveData && (
              <>
                <ServerOverview
                  server={live.server}
                  totalRounds={totalRounds}
                />
                {totalRounds !== null && live.server.round > 0 && (
                  <RoundProgress
                    current={live.server.round}
                    total={totalRounds}
                  />
                )}
                {nodes.length > 0 && (
                  <>
                    <Label>Clients</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {nodes.map((n) => (
                        <NodeCard
                          key={n.nodeId}
                          node={n}
                          maxBatch={live.maxBatchSeen}
                          totalEpochs={totalEpochs}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {/* Rounds */}
            {!rangeLoading && roundMetrics.length > 0 && (
              <>
                <Label>Rounds</Label>
                <RoundCardsStrip
                  rounds={roundMetrics}
                  currentRound={currentRound}
                />
              </>
            )}

            {/* Trend charts (range data + live merged) */}
            {rangeLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-44 w-full rounded-sm" />
                ))}
              </div>
            )}
            {!rangeLoading &&
              (accuracyData.length >= 2 || lossData.length >= 2) && (
                <>
                  <Label sub="Global model performance after aggregation">
                    Aggregated trends
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <TrendChart
                      title="Accuracy"
                      description="Aggregated accuracy across all clients"
                      data={accuracyData}
                      lines={[{ key: "accuracy", color: "#10b981" }]}
                      config={accuracyConfig}
                      roundMarkers={roundMarkers}
                    />
                    <TrendChart
                      title="Loss"
                      description="Train and eval loss after aggregation"
                      data={lossData}
                      lines={[
                        { key: "trainLoss", color: "var(--amber-primary)" },
                        { key: "evalLoss", color: "#f97316" },
                      ]}
                      config={lossConfig}
                      roundMarkers={roundMarkers}
                    />
                  </div>
                </>
              )}
            {!rangeLoading && hasClientCharts && (
              <>
                <Label sub="Individual node performance per round">
                  Per-client metrics
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {clientTrainLoss.data.length >= 2 && (
                    <TrendChart
                      title="Train Loss"
                      data={clientTrainLoss.data}
                      lines={clientTrainLoss.lines}
                      config={clientTrainLoss.config}
                      roundMarkers={roundMarkers}
                    />
                  )}
                  {clientEvalLoss.data.length >= 2 && (
                    <TrendChart
                      title="Eval Loss"
                      data={clientEvalLoss.data}
                      lines={clientEvalLoss.lines}
                      config={clientEvalLoss.config}
                      roundMarkers={roundMarkers}
                    />
                  )}
                  {clientTrainAcc.data.length >= 2 && (
                    <TrendChart
                      title="Train Accuracy"
                      data={clientTrainAcc.data}
                      lines={clientTrainAcc.lines}
                      config={clientTrainAcc.config}
                      roundMarkers={roundMarkers}
                    />
                  )}
                  {clientEvalAcc.data.length >= 2 && (
                    <TrendChart
                      title="Eval Accuracy"
                      data={clientEvalAcc.data}
                      lines={clientEvalAcc.lines}
                      config={clientEvalAcc.config}
                      roundMarkers={roundMarkers}
                    />
                  )}
                  {clientTrainDuration.data.length >= 2 && (
                    <TrendChart
                      title="Train Duration (s)"
                      data={clientTrainDuration.data}
                      lines={clientTrainDuration.lines}
                      config={clientTrainDuration.config}
                      roundMarkers={roundMarkers}
                    />
                  )}
                  {clientEvalDuration.data.length >= 2 && (
                    <TrendChart
                      title="Eval Duration (s)"
                      data={clientEvalDuration.data}
                      lines={clientEvalDuration.lines}
                      config={clientEvalDuration.config}
                      roundMarkers={roundMarkers}
                    />
                  )}
                </div>
              </>
            )}

            {/* Waiting state — run selected but no data yet */}
            {!rangeLoading &&
              !hasLiveData &&
              accuracyData.length < 2 &&
              lossData.length < 2 && (
                <div
                  className="flex items-center gap-2 font-mono text-[11px]"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <WifiOff size={13} /> No metrics yet — run must be active to
                  stream live data
                </div>
              )}
          </>
        )}
      </div>
    </>
  );
}

// ── Small helpers ──────────────────────────────────────────────────────────────

function Label({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p
        className="font-mono text-[9px] tracking-[0.1em] uppercase"
        style={{ color: "var(--text-secondary)", opacity: 0.6 }}
      >
        {children}
      </p>
      {sub && (
        <p
          className="font-mono text-[8px]"
          style={{ color: "var(--text-secondary)", opacity: 0.4 }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
