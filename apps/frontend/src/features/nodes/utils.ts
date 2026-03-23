export { relativeTime } from "../training/utils";

export function nodeStatusVariant(
  status: string,
): "success" | "warning" | "danger" | "amber" | "muted" {
  switch (status) {
    case "READY":
      return "success";
    case "TRAINING":
      return "amber";
    case "INITIALIZING":
      return "warning";
    case "ERROR":
      return "danger";
    default:
      return "muted";
  }
}

export const NODE_STATUS_COLOR: Record<string, string> = {
  READY: "#10b981",
  TRAINING: "var(--amber-primary)",
  INITIALIZING: "var(--amber-dim)",
  ERROR: "#ef4444",
  OFFLINE: "var(--text-secondary)",
  CREATED: "var(--text-secondary)",
};

export const NODE_STATUS_GROUPS: Array<{
  label: string;
  statuses: string[];
  color: string;
}> = [
  { label: "ready", statuses: ["READY"], color: NODE_STATUS_COLOR.READY },
  {
    label: "training",
    statuses: ["TRAINING"],
    color: NODE_STATUS_COLOR.TRAINING,
  },
  {
    label: "initializing",
    statuses: ["INITIALIZING"],
    color: NODE_STATUS_COLOR.INITIALIZING,
  },
  {
    label: "offline",
    statuses: ["OFFLINE", "ERROR"],
    color: NODE_STATUS_COLOR.ERROR,
  },
  {
    label: "inactive",
    statuses: ["CREATED"],
    color: NODE_STATUS_COLOR.CREATED,
  },
];

export const NODE_COLORS = [
  "var(--amber-primary)",
  "#10b981",
  "#a78bfa",
  "#38bdf8",
  "#f97316",
  "#fb7185",
];
