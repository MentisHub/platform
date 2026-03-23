"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProject, useUpdateProject } from "./queries";
import { useCurrentOrg } from "@/features/organizations/use-current-org";
import { usePushCrumb } from "@/components/layout/nav/breadcrumb/breadcrumb-context";
import { toast } from "sonner";

interface ProjectSettingsViewProps {
  projectId: string;
}

interface TrainingConfig {
  num_rounds: string;
  min_available_clients: string;
  min_fit_clients: string;
  min_evaluate_clients: string;
  fraction_fit: string;
  fraction_evaluate: string;
}

const emptyConfig: TrainingConfig = {
  num_rounds: "",
  min_available_clients: "",
  min_fit_clients: "",
  min_evaluate_clients: "",
  fraction_fit: "",
  fraction_evaluate: "",
};

function toFormConfig(raw: Record<string, unknown> | null | undefined): TrainingConfig {
  if (!raw) return emptyConfig;
  return {
    num_rounds: raw.num_rounds != null ? String(raw.num_rounds) : "",
    min_available_clients: raw.min_available_clients != null ? String(raw.min_available_clients) : "",
    min_fit_clients: raw.min_fit_clients != null ? String(raw.min_fit_clients) : "",
    min_evaluate_clients: raw.min_evaluate_clients != null ? String(raw.min_evaluate_clients) : "",
    fraction_fit: raw.fraction_fit != null ? String(raw.fraction_fit) : "",
    fraction_evaluate: raw.fraction_evaluate != null ? String(raw.fraction_evaluate) : "",
  };
}

function toApiConfig(cfg: TrainingConfig): Record<string, unknown> | null {
  const result: Record<string, unknown> = {};
  if (cfg.num_rounds) result.num_rounds = parseInt(cfg.num_rounds, 10);
  if (cfg.min_available_clients) result.min_available_clients = parseInt(cfg.min_available_clients, 10);
  if (cfg.min_fit_clients) result.min_fit_clients = parseInt(cfg.min_fit_clients, 10);
  if (cfg.min_evaluate_clients) result.min_evaluate_clients = parseInt(cfg.min_evaluate_clients, 10);
  if (cfg.fraction_fit) result.fraction_fit = parseFloat(cfg.fraction_fit);
  if (cfg.fraction_evaluate) result.fraction_evaluate = parseFloat(cfg.fraction_evaluate);
  return Object.keys(result).length > 0 ? result : null;
}

export function ProjectSettingsView({ projectId }: ProjectSettingsViewProps) {
  usePushCrumb({ label: "Settings" });

  const { org } = useCurrentOrg();
  const { data: project, isLoading } = useProject(org?.id, projectId);
  const updateMutation = useUpdateProject(org?.id ?? "");

  const [config, setConfig] = useState<TrainingConfig>(emptyConfig);

  useEffect(() => {
    if (project) {
      setConfig(toFormConfig(project.trainingConfig as Record<string, unknown> | null | undefined));
    }
  }, [project]);

  const setField = (field: keyof TrainingConfig) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = () => {
    const trainingConfig = toApiConfig(config);
    updateMutation.mutate(
      { projectId, data: { trainingConfig } },
      {
        onSuccess: () => toast.success("Settings saved"),
      },
    );
  };

  const handleClear = () => {
    setConfig(emptyConfig);
    updateMutation.mutate(
      { projectId, data: { trainingConfig: null } },
      {
        onSuccess: () => toast.success("Training config cleared"),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-4 w-32 animate-pulse rounded" style={{ background: "var(--surface-2)" }} />
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-8 max-w-lg">
      <div>
        <h1 className="text-base font-semibold">Project Settings</h1>
        <p className="text-[13px] mt-1" style={{ color: "var(--text-secondary)" }}>
          {project?.name}
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-[13px] font-semibold">Default Training Configuration</h2>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
            These values are used as defaults for all training runs in this project. Per-run configuration takes precedence.
          </p>
        </div>

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

        <div className="flex items-center gap-2 pt-1">
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving…" : "Save"}
          </Button>
          <Button variant="ghost" onClick={handleClear} disabled={updateMutation.isPending}>
            Clear defaults
          </Button>
        </div>
      </section>
    </div>
  );
}
