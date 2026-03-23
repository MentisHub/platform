"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useFabs } from "@/features/fabs/queries";
import { useCurrentOrg } from "@/features/organizations/use-current-org";
import { useCreateTraining } from "../queries";
import { ChevronDown, ChevronRight } from "lucide-react";

interface CreateTrainingDialogProps {
  projectId: string;
  children: React.ReactNode;
}

interface TrainingConfig {
  num_rounds: string;
  min_available_clients: string;
  min_fit_clients: string;
  min_evaluate_clients: string;
  fraction_fit: string;
  fraction_evaluate: string;
}

const defaultConfig: TrainingConfig = {
  num_rounds: "",
  min_available_clients: "",
  min_fit_clients: "",
  min_evaluate_clients: "",
  fraction_fit: "",
  fraction_evaluate: "",
};

function buildConfiguration(
  cfg: TrainingConfig,
): Record<string, unknown> | undefined {
  const result: Record<string, unknown> = {};
  if (cfg.num_rounds) result.num_rounds = parseInt(cfg.num_rounds, 10);
  if (cfg.min_available_clients)
    result.min_available_clients = parseInt(cfg.min_available_clients, 10);
  if (cfg.min_fit_clients)
    result.min_fit_clients = parseInt(cfg.min_fit_clients, 10);
  if (cfg.min_evaluate_clients)
    result.min_evaluate_clients = parseInt(cfg.min_evaluate_clients, 10);
  if (cfg.fraction_fit) result.fraction_fit = parseFloat(cfg.fraction_fit);
  if (cfg.fraction_evaluate)
    result.fraction_evaluate = parseFloat(cfg.fraction_evaluate);
  return Object.keys(result).length > 0 ? result : undefined;
}

export function CreateTrainingDialog({
  projectId,
  children,
}: CreateTrainingDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedFabId, setSelectedFabId] = useState<string | undefined>();
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<TrainingConfig>(defaultConfig);

  const { org } = useCurrentOrg();
  const { data: fabsData, isLoading: fabsLoading } = useFabs(org?.id ?? "");
  const createMutation = useCreateTraining(projectId);

  const setField =
    (field: keyof TrainingConfig) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setConfig((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = () => {
    if (!selectedFabId) return;
    const configuration = buildConfiguration(config);
    createMutation.mutate(
      { fabId: selectedFabId, ...(configuration ? { configuration } : {}) },
      {
        onSuccess: () => {
          setOpen(false);
          setSelectedFabId(undefined);
          setConfig(defaultConfig);
          setShowConfig(false);
        },
      },
    );
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSelectedFabId(undefined);
      setConfig(defaultConfig);
      setShowConfig(false);
    }
    setOpen(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Training Run</DialogTitle>
          <DialogDescription>
            Select a Federated Application Bundle to deploy for this run.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="flex flex-col gap-1.5">
            <Label>FAB</Label>
            {fabsLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <Select value={selectedFabId} onValueChange={setSelectedFabId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a FAB…" />
                </SelectTrigger>
                <SelectContent>
                  {fabsData?.data.map((fab) => (
                    <SelectItem key={fab.id} value={fab.id}>
                      <span className="flex items-center gap-2">
                        <span>{fab.name}</span>
                        <span style={{ color: "var(--text-secondary)" }}>
                          v{fab.version}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                  {(!fabsData?.data || fabsData.data.length === 0) && (
                    <div
                      className="px-3 py-4 text-center font-mono text-[11px]"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      No FABs available
                    </div>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              className="flex items-center gap-1.5 text-[12px] font-medium w-fit"
              style={{ color: "var(--text-secondary)" }}
              onClick={() => setShowConfig((v) => !v)}
            >
              {showConfig ? (
                <ChevronDown className="size-3.5" />
              ) : (
                <ChevronRight className="size-3.5" />
              )}
              Advanced configuration
            </button>

            {showConfig && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[11px]">Rounds</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="e.g. 10"
                    value={config.num_rounds}
                    onChange={setField("num_rounds")}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[11px]">Min available clients</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="e.g. 2"
                    value={config.min_available_clients}
                    onChange={setField("min_available_clients")}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[11px]">Min fit clients</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="e.g. 2"
                    value={config.min_fit_clients}
                    onChange={setField("min_fit_clients")}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[11px]">Min evaluate clients</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="e.g. 2"
                    value={config.min_evaluate_clients}
                    onChange={setField("min_evaluate_clients")}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[11px]">Fraction fit</Label>
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.1}
                    placeholder="e.g. 1.0"
                    value={config.fraction_fit}
                    onChange={setField("fraction_fit")}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[11px]">Fraction evaluate</Label>
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.1}
                    placeholder="e.g. 1.0"
                    value={config.fraction_evaluate}
                    onChange={setField("fraction_evaluate")}
                  />
                </div>
              </div>
            )}
          </div>

          {createMutation.isError && (
            <p
              className="font-mono text-[11px]"
              style={{ color: "var(--color-danger, #ef4444)" }}
            >
              Failed to create training run. Please try again.
            </p>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedFabId || createMutation.isPending}
          >
            {createMutation.isPending ? "Creating…" : "Create Run"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
