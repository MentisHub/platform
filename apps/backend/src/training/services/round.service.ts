import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateRoundInput,
  UpdateRoundInput,
} from '../interfaces/round.interface';

@Injectable()
export class RoundService {
  private readonly logger = new Logger(RoundService.name);

  constructor(private readonly prisma: PrismaService) {}

  async upsertRound(data: CreateRoundInput) {
    return this.prisma.round.upsert({
      where: {
        runId_number: {
          runId: data.runId,
          number: data.number,
        },
      },
      create: {
        runId: data.runId,
        number: data.number,
        startedAt: data.startedAt || new Date(),
      },
      update: {},
    });
  }

  async updateRound(roundId: string, data: UpdateRoundInput) {
    const updateData = {
      ...data,
      metrics: data.metrics === null ? Prisma.JsonNull : data.metrics,
    };

    return this.prisma.round.update({
      where: { id: roundId },
      data: updateData,
    });
  }

  async updateAggregatedMetrics(
    roundId: string,
    metrics: Prisma.InputJsonValue | null,
  ) {
    await this.prisma.round.update({
      where: { id: roundId },
      data: {
        metrics: metrics === null ? Prisma.JsonNull : metrics,
      },
    });
  }

  async getLatestRound(runId: string) {
    const rounds = await this.prisma.round.findMany({
      where: { runId },
      orderBy: { number: 'desc' },
      take: 1,
    });

    return rounds[0] || null;
  }

  async updateParticipants(
    roundId: string,
    totalParticipants: number,
    successfulParticipants: number,
  ) {
    await this.prisma.round.update({
      where: { id: roundId },
      data: {
        totalParticipants,
        successfulParticipants,
      },
    });
  }

  async completeRound(roundId: string) {
    await this.prisma.round.update({
      where: { id: roundId },
      data: {
        completedAt: new Date(),
      },
    });
  }

  async getRoundsByRun(runId: string) {
    return this.prisma.round.findMany({
      where: { runId },
      orderBy: { number: 'asc' },
      include: {
        participants: {
          include: {
            node: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        },
      },
    });
  }
}
