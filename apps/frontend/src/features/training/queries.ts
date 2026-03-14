"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import { trainingApi } from "./api";
import type { CreateTraining } from "@platform/contracts";

export function useCreateTraining(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTraining) => trainingApi.create(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.details() });
    },
  });
}

export function useDeployTraining(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (trainingId: string) => trainingApi.deploy(projectId, trainingId),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.training.detail(updated.trainingRunId), updated);
    },
  });
}

export function useRunTraining(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (trainingId: string) => trainingApi.run(projectId, trainingId),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.training.detail(updated.id), updated);
      qc.invalidateQueries({ queryKey: queryKeys.projects.details() });
    },
  });
}
