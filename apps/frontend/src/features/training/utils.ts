export function statusVariant(
  status: string,
): "success" | "warning" | "danger" | "amber" | "muted" {
  switch (status) {
    case "RUNNING":
      return "amber";
    case "DEPLOYING":
      return "warning";
    case "COMPLETED":
    case "READY":
      return "success";
    case "FAILED":
      return "danger";
    default:
      return "muted";
  }
}

export const STATUS_COLOR: Record<string, string> = {
  RUNNING:   "var(--amber-primary)",
  DEPLOYING: "var(--amber-dim)",
  COMPLETED: "#10b981",
  READY:     "#10b981",
  FAILED:    "#ef4444",
  CANCELLED: "var(--text-secondary)",
  PENDING:   "var(--text-secondary)",
  PAUSED:    "var(--text-secondary)",
};

export const STATUS_GROUPS: Array<{
  label: string;
  statuses: string[];
  variant: "amber" | "success" | "danger" | "muted";
}> = [
  { label: "running",   statuses: ["RUNNING", "DEPLOYING"],  variant: "amber" },
  { label: "completed", statuses: ["COMPLETED", "READY"],    variant: "success" },
  { label: "failed",    statuses: ["FAILED", "CANCELLED"],   variant: "danger" },
  { label: "pending",   statuses: ["PENDING", "PAUSED"],     variant: "muted" },
];

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function relativeTime(iso: string): string {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs  = Math.abs(diff);
  if (abs < 60)   return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  return rtf.format(Math.round(diff / 86400), "day");
}
