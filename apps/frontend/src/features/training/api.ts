import { api } from "@/lib/api/client";
import type {
  CreateTraining,
  StartTrainingResponse,
  TrainingRunResponse,
} from "@platform/contracts";

export const trainingApi = {
  list: (projectId: string) =>
    api.get<TrainingRunResponse[]>(`/projects/${projectId}/trainings`),

  get: (projectId: string, trainingId: string) =>
    api.get<TrainingRunResponse>(`/projects/${projectId}/trainings/${trainingId}`),

  create: (projectId: string, data: CreateTraining) =>
    api.post<StartTrainingResponse>(`/projects/${projectId}/trainings`, data),

  deploy: (projectId: string, trainingId: string) =>
    api.post<StartTrainingResponse>(
      `/projects/${projectId}/trainings/${trainingId}/deploy`,
    ),

  run: (projectId: string, trainingId: string) =>
    api.post<TrainingRunResponse>(
      `/projects/${projectId}/trainings/${trainingId}/run`,
    ),
};
