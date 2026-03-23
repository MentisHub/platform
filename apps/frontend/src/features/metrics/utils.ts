export function stripPrefix(name: string): string {
  return name.replace(/^mentishub_/, "");
}

export function metricCategory(
  name: string,
  metadata?: { type?: string; help?: string },
): "chart" | "stat" | "skip" {
  const type = metadata?.type;
  const help = metadata?.help ?? "";

  if (name.endsWith("_bucket") || name.endsWith("_count")) return "skip";
  if (help.startsWith("[state]")) return "skip";

  if (type === "counter" || name.endsWith("_total")) return "stat";

  return "chart";
}

export function formatMetricName(name: string): string {
  const words = stripPrefix(name)
    .replace(/^fl_(?:server|client)_/, "")
    .replace(/_seconds_sum$/, " (s)")
    .replace(/_seconds$/, " (s)")
    .replace(/_/g, " ")
    .split(" ");
  return words
    .map((w) => (/^\w/.test(w) ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
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
