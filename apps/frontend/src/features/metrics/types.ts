export interface NodeState {
  nodeId: string;
  label: string;
  lastTs: number;
  epoch: number;
  batch: number;
  trainLoss: number | null;
  trainAccuracy: number | null;
  evalLoss: number | null;
  evalAccuracy: number | null;
}

export interface ServerState {
  round: number;
  aggTrainLoss: number | null;
  aggEvalLoss: number | null;
  aggAccuracy: number | null;
  trainExamples: number;
  evalExamples: number;
}

export interface HistoryPoint {
  t: number;
  round: number;
  aggAccuracy: number | null;
  aggTrainLoss: number | null;
  aggEvalLoss: number | null;
}

export interface LiveState {
  nodes: Map<string, NodeState>;
  server: ServerState;
  history: HistoryPoint[];
  maxBatchSeen: number;
  nodeCounter: number;
}

export interface RoundMetrics {
  round: number;
  acc: number | null;
  trainLoss: number | null;
  evalLoss: number | null;
  trainExamples: number | null;
}
