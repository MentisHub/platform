"use client";

import { useRef, useState, useEffect } from "react";
import type { MetricsStreamEvent } from "@platform/contracts";
import type { LiveState } from "../types";
import { stripPrefix } from "../utils";

export function useLiveMetrics(
  event: MetricsStreamEvent | null,
  nodeNameMap: Map<string, string>,
) {
  const stateRef = useRef<LiveState>({
    nodes: new Map(),
    server: {
      round: 0,
      aggTrainLoss: null,
      aggEvalLoss: null,
      aggAccuracy: null,
      trainExamples: 0,
      evalExamples: 0,
    },
    history: [],
    maxBatchSeen: 0,
    nodeCounter: 0,
  });
  const [rev, setRev] = useState(0);

  useEffect(() => {
    if (!event) return;
    const s = stateRef.current;

    for (const series of event.series) {
      const name = stripPrefix(series.metric.__name__ ?? "");
      const [ts, raw] = series.value;
      const num = parseFloat(raw);
      if (!Number.isFinite(num)) continue;

      const nid = series.metric.node_id;

      if (nid) {
        if (!s.nodes.has(nid)) {
          const label = nodeNameMap.get(nid) ?? `node-${nid.slice(-6)}`;
          s.nodeCounter++;
          s.nodes.set(nid, {
            nodeId: nid,
            label,
            lastTs: ts,
            epoch: 0,
            batch: 0,
            trainLoss: null,
            trainAccuracy: null,
            evalLoss: null,
            evalAccuracy: null,
          });
        }
        const node = s.nodes.get(nid)!;
        node.lastTs = ts;
        switch (name) {
          case "fl_client_current_epoch":
            node.epoch = num;
            break;
          case "fl_client_current_batch":
            node.batch = num;
            if (num > s.maxBatchSeen) s.maxBatchSeen = num;
            break;
          case "fl_client_train_loss":
            node.trainLoss = num;
            break;
          case "fl_client_train_accuracy":
            node.trainAccuracy = num;
            break;
          case "fl_client_eval_loss":
            node.evalLoss = num;
            break;
          case "fl_client_eval_accuracy":
            node.evalAccuracy = num;
            break;
        }
      } else {
        switch (name) {
          case "fl_server_round_current":
            s.server.round = num;
            break;
          case "fl_server_aggregated_train_loss":
            s.server.aggTrainLoss = num;
            break;
          case "fl_server_aggregated_eval_loss":
            s.server.aggEvalLoss = num;
            break;
          case "fl_server_aggregated_accuracy":
            s.server.aggAccuracy = num;
            break;
          case "fl_server_train_examples_total":
            s.server.trainExamples = num;
            break;
          case "fl_server_eval_examples_total":
            s.server.evalExamples = num;
            break;
        }
      }
    }

    // Push server history point every poll
    const last = s.history[s.history.length - 1];
    const ts = event.timestamp ?? Math.floor(Date.now() / 1000);
    if (!last || ts - last.t >= 4) {
      s.history.push({
        t: ts,
        round: s.server.round,
        aggAccuracy: s.server.aggAccuracy,
        aggTrainLoss: s.server.aggTrainLoss,
        aggEvalLoss: s.server.aggEvalLoss,
      });
      if (s.history.length > 120) s.history.shift();
    }

    setRev((r) => r + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);

  return { live: stateRef.current, rev };
}
