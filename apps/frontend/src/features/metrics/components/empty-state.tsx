import { Activity } from "lucide-react";
import Link from "next/link";

export function EmptyState({ projectId }: { projectId: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Activity size={32} style={{ color: "var(--border-active)" }} strokeWidth={1} />
      <div className="text-center">
        <p className="font-display font-bold text-[14px]" style={{ color: "var(--text-primary)" }}>No training runs yet</p>
        <p className="font-mono text-[11px] mt-1" style={{ color: "var(--text-secondary)" }}>Start a training run to see live metrics</p>
      </div>
      <Link href={`/projects/${projectId}/runs`} className="font-mono text-[10px] tracking-[0.06em] uppercase px-3 py-1.5 rounded-sm border hover:bg-surface-2 transition-colors" style={{ borderColor: "var(--border-active)", color: "var(--amber-primary)" }}>
        Go to Runs →
      </Link>
    </div>
  );
}
