import type { ReactNode } from "react";

export function NodeGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span
        className="font-mono text-[10px] tracking-[0.06em] uppercase px-0.5"
        style={{ color: "var(--text-secondary)" }}
      >
        {label}
      </span>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}
