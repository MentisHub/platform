"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";
import { trainingApi } from "./api";
import type { CreateTraining } from "@platform/contracts";

export function useTrainingRuns(projectId: string) {
  return useQuery({
    queryKey: queryKeys.training.list(projectId),
    queryFn: () => trainingApi.list(projectId),
    enabled: !!projectId,
    refetchInterval: 8_000,
  });
}

export function useTrainingRun(projectId: string, trainingId: string) {
  return useQuery({
    queryKey: queryKeys.training.detail(trainingId),
    queryFn: () => trainingApi.get(projectId, trainingId),
    enabled: !!projectId && !!trainingId,
  });
}

export function useCreateTraining(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTraining) => trainingApi.create(projectId, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.training.list(projectId) });
    },
  });
}

export function useDeployTraining(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (trainingId: string) => trainingApi.deploy(projectId, trainingId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.training.list(projectId) });
    },
  });
}

export function useRunTraining(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (trainingId: string) => trainingApi.run(projectId, trainingId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.training.list(projectId) });
    },
  });
}
