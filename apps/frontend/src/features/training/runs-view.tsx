"use client";

import { usePushCrumb } from "@/components/layout/nav/breadcrumb/breadcrumb-context";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import { useTrainingRuns } from "./queries";
import { CreateTrainingDialog } from "./components/create-training-dialog";
import { RunRow } from "./components/run-row";
import { NodeStatusBar, useReadyNodeCount } from "./components/node-status-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { Play, Plus } from "lucide-react";

interface RunsViewProps {
  projectId: string;
}

export function RunsView({ projectId }: RunsViewProps) {
  usePushCrumb({ label: "Runs" });

  const { data: runs, isLoading } = useTrainingRuns(projectId);
  const readyNodeCount = useReadyNodeCount(projectId);

  const hasRuns = (runs?.length ?? 0) > 0;

  return (
    <>
      <Header title="Runs">
        <CreateTrainingDialog projectId={projectId}>
          <Button size="sm">
            <Plus size={11} />
            New Run
          </Button>
        </CreateTrainingDialog>
      </Header>

      <div className="flex-1 p-5 flex flex-col gap-4 min-h-0 overflow-y-auto">
        <NodeStatusBar projectId={projectId} />

        {isLoading && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[52px] w-full" />
            ))}
          </div>
        )}

        {!isLoading && !hasRuns && (
          <EmptyState
            icon={Play}
            title="No training runs yet"
            description="Create a run to start federated learning"
            action={
              <CreateTrainingDialog projectId={projectId}>
                <Button variant="outline">Create First Run →</Button>
              </CreateTrainingDialog>
            }
          />
        )}

        {!isLoading && hasRuns && (
          <>
            <span
              className="font-mono text-[10px] tracking-[0.06em] uppercase"
              style={{ color: "var(--text-secondary)" }}
            >
              {runs!.length} run{runs!.length !== 1 ? "s" : ""}
            </span>
            <div className="flex flex-col gap-2">
              {runs!.map((run) => (
                <RunRow
                  key={run.id}
                  run={run}
                  projectId={projectId}
                  readyNodeCount={readyNodeCount}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
