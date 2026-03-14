import { api } from "@/lib/api/client";
import type {
  CreateTraining,
  StartTrainingResponse,
  TrainingRunResponse,
} from "@platform/contracts";

export const trainingApi = {
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
