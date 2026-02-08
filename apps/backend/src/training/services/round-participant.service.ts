import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateRoundParticipantInput,
  UpdateRoundParticipantInput,
} from '../interfaces/round.interface';

@Injectable()
export class RoundParticipantService {
  private readonly logger = new Logger(RoundParticipantService.name);

  constructor(private readonly prisma: PrismaService) {}

  async upsertParticipant(data: CreateRoundParticipantInput) {
    const createData = {
      ...data,
      metrics: data.metrics === null ? Prisma.JsonNull : data.metrics,
    };

    const updateData = {
      completedAt: data.completedAt,
      metrics: data.metrics === null ? Prisma.JsonNull : data.metrics,
      failureReason: data.failureReason,
    };

    return this.prisma.roundParticipant.upsert({
      where: {
        roundId_nodeId: {
          roundId: data.roundId,
          nodeId: data.nodeId,
        },
      },
      create: createData,
      update: updateData,
    });
  }

  async updateParticipant(
    roundId: string,
    nodeId: string,
    data: UpdateRoundParticipantInput,
  ) {
    const updateData = {
      ...data,
      metrics: data.metrics === null ? Prisma.JsonNull : data.metrics,
    };

    return this.prisma.roundParticipant.update({
      where: {
        roundId_nodeId: {
          roundId,
          nodeId,
        },
      },
      data: updateData,
    });
  }

  async getParticipantsByRound(roundId: string) {
    return this.prisma.roundParticipant.findMany({
      where: { roundId },
      include: {
        node: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });
  }

  async countCompletedParticipants(roundId: string): Promise<number> {
    return this.prisma.roundParticipant.count({
      where: {
        roundId,
        completedAt: { not: null },
      },
    });
  }

  async countTotalParticipants(roundId: string): Promise<number> {
    return this.prisma.roundParticipant.count({
      where: { roundId },
    });
  }

  async areAllParticipantsCompleted(roundId: string): Promise<boolean> {
    const total = await this.countTotalParticipants(roundId);
    const completed = await this.countCompletedParticipants(roundId);

    return total > 0 && total === completed;
  }
}
