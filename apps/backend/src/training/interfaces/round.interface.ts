import { Prisma } from '@prisma/client';

export interface CreateRoundInput {
  runId: string;
  number: number;
  startedAt?: Date;
}

export interface UpdateRoundInput {
  completedAt?: Date;
  metrics?: Prisma.InputJsonValue | null;
  totalParticipants?: number;
  successfulParticipants?: number;
}

export interface CreateRoundParticipantInput {
  roundId: string;
  nodeId: string;
  startedAt?: Date;
  completedAt?: Date | null;
  metrics?: Prisma.InputJsonValue | null;
  failureReason?: string | null;
}

export interface UpdateRoundParticipantInput {
  completedAt?: Date | null;
  metrics?: Prisma.InputJsonValue | null;
  failureReason?: string | null;
}
