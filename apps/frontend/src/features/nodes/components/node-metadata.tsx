function fmtKey(k: string): string {
  return k.replace(/[_-]/g, " ");
}

export function NodeMetadata({
  metadata,
}: {
  metadata: Record<string, unknown>;
}) {
  const entries = Object.entries(metadata)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .slice(0, 7);
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
      {entries.map(([k, v]) => (
        <span
          key={k}
          className="font-mono text-[10px]"
          style={{ color: "var(--text-secondary)" }}
        >
          <span style={{ opacity: 0.6 }}>{fmtKey(k)}</span>{" "}
          <span style={{ color: "var(--text-primary)" }}>
            {typeof v === "number" ? v.toLocaleString() : String(v)}
          </span>
        </span>
      ))}
    </div>
  );
}
