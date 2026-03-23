import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { statusVariant } from "@/features/training/utils";
import type { TrainingRunResponse } from "@platform/contracts";

function RunStatusDot({ status }: { status: string }) {
  const color =
    (
      {
        RUNNING: "var(--amber-primary)",
        DEPLOYING: "var(--amber-dim)",
        READY: "#10b981",
        PENDING: "var(--text-secondary)",
        FAILED: "#ef4444",
      } as Record<string, string>
    )[status] ?? "var(--text-secondary)";
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
      style={{ background: color }}
    />
  );
}

interface RunSelectorProps {
  runs: TrainingRunResponse[] | undefined;
  activeRunId: string | undefined;
  activeRun: TrainingRunResponse | undefined;
  onRunChange: (id: string) => void;
}

export function RunSelector({
  runs,
  activeRunId,
  activeRun,
  onRunChange,
}: RunSelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="font-mono text-[10px] tracking-[0.06em] uppercase shrink-0"
        style={{ color: "var(--text-secondary)" }}
      >
        Training run
      </span>
      <div className="w-72">
        <Select value={activeRunId} onValueChange={onRunChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select a run…" />
          </SelectTrigger>
          <SelectContent>
            {runs?.map((run) => (
              <SelectItem key={run.id} value={run.id}>
                <span className="flex items-center gap-2">
                  <RunStatusDot status={run.status} />
                  {run.id.slice(0, 8)}… ·{" "}
                  {new Date(run.createdAt).toLocaleDateString()}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {activeRun && (
        <Badge
          variant={statusVariant(activeRun.status)}
          dot
          pulse={
            activeRun.status === "RUNNING" || activeRun.status === "DEPLOYING"
          }
        >
          {activeRun.status}
        </Badge>
      )}
    </div>
  );
}
