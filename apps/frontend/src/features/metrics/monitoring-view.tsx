"use client";

import { usePushCrumb } from "@/components/layout/nav/breadcrumb/breadcrumb-context";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import { stripPrefix, formatMetricName, metricCategory, fmtNum } from "./utils";
import { ServerOverview } from "./components/server-overview";
import { RoundProgress } from "./components/round-progress";
import { NodeCard } from "./components/node-card";
import { TrendChart, type RoundMarker } from "./components/trend-chart";
import { buildRoundMetrics, RoundCardsStrip } from "./components/round-cards";
import { EmptyState } from "./components/empty-state";
import { RunSelector } from "./components/run-selector";
import { NODE_COLORS } from "../nodes/utils";
import type { HistoryPoint } from "./types";

function prefersRoundAxis(name: string): boolean {
  return name.includes("_duration") || name.includes("_seconds");
}

const SERVER_LIVE: Record<string, (h: HistoryPoint) => number | null> = {
  fl_server_aggregated_accuracy: (h) => h.aggAccuracy,
  fl_server_aggregated_train_loss: (h) => h.aggTrainLoss,
  fl_server_aggregated_eval_loss: (h) => h.aggEvalLoss,
};

// ── Main view ──────────────────────────────────────────────────────────────────

interface MonitoringViewProps {
  projectId: string;
  initialRunId?: string;
}

export function MonitoringView({
  projectId,
  initialRunId,
}: MonitoringViewProps) {
  usePushCrumb({ label: "Monitoring" });

  const [selectedRunId, setSelectedRunId] = useState<string | undefined>(
    initialRunId,
  );

  const { org } = useCurrentOrg();
  const { data: runs, isLoading: runsLoading } = useTrainingRuns(projectId);
  const { data: nodesData } = useNodes(org?.id, { projectId });

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

  const isRunLive = activeRun ? !activeRun.completedAt : false;
  const { event, connected } = useMetricsStream(
    projectId,
    isRunLive ? activeRunId : undefined,
  );
  const { live, rev: liveRev } = useLiveMetrics(event, nodeNameMap);

  const { data: rangeData, isLoading: rangeLoading } = useQuery({
    queryKey: ["metrics", "range", projectId, activeRunId],
    queryFn: () => metricsApi.range(projectId, activeRunId!, { step: "1m" }),
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

  // Auto-discover server-level metrics — split by type: charts vs stat cards
  const { serverCharts, serverStats } = useMemo(() => {
    type Meta = { type?: string; help?: string };
    const seriesMap = new Map<string, [number, string][]>();
    const metaMap = new Map<string, Meta>();
    for (const s of rangeData?.series ?? []) {
      if (s.metric.node_id) continue;
      const name = stripPrefix(s.metric.__name__ ?? "");
      if (!name) continue;
      if (s.metadata) metaMap.set(name, s.metadata);
      if (metricCategory(name, metaMap.get(name)) === "skip") continue;
      const existing = seriesMap.get(name) ?? [];
      seriesMap.set(name, existing.concat(s.values));
    }

    const charts: {
      name: string;
      title: string;
      data: { t: number; value: number }[];
      lines: { key: string; color: string }[];
      config: ChartConfig;
      xAxis: "time" | "round";
    }[] = [];
    const stats: { name: string; title: string; value: string }[] = [];

    for (const [name, values] of seriesMap.entries()) {
      const cat = metricCategory(name, metaMap.get(name));
      if (cat === "skip") continue;

      const nums = values
        .map(([t, v]) => [t, parseFloat(v)] as [number, number])
        .filter(([, n]) => Number.isFinite(n));

      if (cat === "stat") {
        const last = nums[nums.length - 1];
        if (last)
          stats.push({
            name,
            title: formatMetricName(name),
            value: fmtNum(last[1]),
          });
        continue;
      }

      // chart
      const map = new Map<number, number>(nums);
      const liveField = SERVER_LIVE[name];
      if (liveField) {
        for (const h of live.history) {
          const v = liveField(h);
          if (v !== null) map.set(h.t, v);
        }
      }
      const data = Array.from(map.entries())
        .sort(([a], [b]) => a - b)
        .map(([t, value]) => ({ t, value }));
      if (data.length < 2) continue;
      const title = formatMetricName(name);
      charts.push({
        name,
        title,
        data,
        lines: [{ key: "value", color: "#10b981" }],
        config: { value: { label: title, color: "#10b981" } } as ChartConfig,
        xAxis: prefersRoundAxis(name) ? ("round" as const) : ("time" as const),
      });
    }

    return { serverCharts: charts, serverStats: stats };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeData, liveRev]);

  // Auto-discover client-level metrics (has node_id), one chart per metric with one line per node
  const clientCharts = useMemo(() => {
    const seriesMap = new Map<string, Map<string, [number, string][]>>();
    for (const s of rangeData?.series ?? []) {
      const nid = s.metric.node_id;
      if (!nid) continue;
      const name = stripPrefix(s.metric.__name__ ?? "");
      if (!name || metricCategory(name, s.metadata ?? undefined) !== "chart")
        continue;
      if (!seriesMap.has(name)) seriesMap.set(name, new Map());
      seriesMap.get(name)!.set(nid, s.values);
    }
    return Array.from(seriesMap.entries()).flatMap(([name, nodeMap]) => {
      const nodeIds = Array.from(nodeMap.keys());
      const tsMap = new Map<number, Record<string, number>>();
      for (const nid of nodeIds) {
        const key = `node_${nid.slice(-6)}`;
        for (const [t, v] of nodeMap.get(nid)!) {
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
      if (data.length < 2) return [];
      const lines = nodeIds.map((nid, i) => ({
        key: `node_${nid.slice(-6)}`,
        color: NODE_COLORS[i % NODE_COLORS.length],
      }));
      const config: ChartConfig = Object.fromEntries(
        nodeIds.map((nid, i) => [
          `node_${nid.slice(-6)}`,
          {
            label: nodeNameMap.get(nid) ?? `node-${nid.slice(-6)}`,
            color: NODE_COLORS[i % NODE_COLORS.length],
          },
        ]),
      );
      return [
        {
          name,
          title: formatMetricName(name),
          data,
          lines,
          config,
          xAxis: prefersRoundAxis(name)
            ? ("round" as const)
            : ("time" as const),
        },
      ];
    });
  }, [rangeData, nodeNameMap]);

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
                  extraStats={serverStats.map((s) => ({ label: s.title, value: s.value }))}
                />
                {totalRounds !== null && live.server.round > 0 && (
                  <RoundProgress
                    current={live.server.round}
                    total={totalRounds}
                  />
                )}
                {nodes.length > 0 && (
                  <>
                    <Label className="text-[9px] font-mono uppercase tracking-[0.1em] text-muted-foreground">
                      Clients
                    </Label>
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
                <Label className="text-[9px] font-mono uppercase tracking-[0.1em] text-muted-foreground">
                  Rounds
                </Label>
                <RoundCardsStrip
                  rounds={roundMetrics}
                  currentRound={currentRound}
                />
              </>
            )}

            {rangeLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-44 w-full rounded-sm" />
                ))}
              </div>
            )}

            {/* Server stat cards — shown when no live stream (completed runs) */}
            {!hasLiveData && !rangeLoading && serverStats.length > 0 && (
              <div className="flex gap-px rounded-sm overflow-hidden border w-fit" style={{ borderColor: "var(--border-subtle)" }}>
                {serverStats.map((s) => (
                  <div key={s.name} className="flex flex-col gap-0.5 px-4 py-3" style={{ background: "var(--surface-1)" }}>
                    <span className="font-mono text-[9px] tracking-[0.08em] uppercase" style={{ color: "var(--text-secondary)" }}>
                      {s.title}
                    </span>
                    <span className="font-mono tabular-nums font-bold text-[15px]" style={{ color: "var(--text-primary)", lineHeight: 1.1 }}>
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Server-level charts (auto-discovered) */}
            {!rangeLoading && serverCharts.length > 0 && (
              <>
                <div className="flex flex-col gap-0.5">
                  <Label className="text-[9px] font-mono uppercase tracking-[0.1em] text-muted-foreground">
                    Aggregated trends
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Global model performance after aggregation
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {serverCharts.map((chart) => (
                    <TrendChart
                      key={chart.name}
                      title={chart.title}
                      data={chart.data}
                      lines={chart.lines}
                      config={chart.config}
                      roundMarkers={roundMarkers}
                      xAxis={chart.xAxis}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Per-client charts (auto-discovered) */}
            {!rangeLoading && clientCharts.length > 0 && (
              <>
                <div className="flex flex-col gap-0.5">
                  <Label className="text-[9px] font-mono uppercase tracking-[0.1em] text-muted-foreground">
                    Per-client metrics
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Individual node performance per round
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {clientCharts.map((chart) => (
                    <TrendChart
                      key={chart.name}
                      title={chart.title}
                      data={chart.data}
                      lines={chart.lines}
                      config={chart.config}
                      roundMarkers={roundMarkers}
                      xAxis={chart.xAxis}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Waiting state — run selected but no data yet */}
            {!rangeLoading &&
              !hasLiveData &&
              serverCharts.length === 0 &&
              serverStats.length === 0 &&
              clientCharts.length === 0 && (
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
