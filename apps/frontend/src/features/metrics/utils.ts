export function stripPrefix(name: string): string {
  return name.replace(/^mentishub_/, "");
}

export function fmtPct(v: number | null): string {
  if (v === null) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

export function fmtLoss(v: number | null): string {
  if (v === null) return "—";
  return v.toFixed(4);
}

export function fmtNum(v: number): string {
  return v >= 1_000_000
    ? `${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000
    ? `${(v / 1_000).toFixed(1)}K`
    : String(v);
}

export function isActive(lastTs: number): boolean {
  return Date.now() / 1000 - lastTs < 20;
}

export function statusVariant(status: string): "success" | "warning" | "danger" | "amber" | "muted" {
  switch (status) {
    case "RUNNING":   return "amber";
    case "DEPLOYING": return "warning";
    case "READY":     return "success";
    case "FAILED":    return "danger";
    default:          return "muted";
  }
}
