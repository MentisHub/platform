import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RoundParticipantService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(data: Prisma.RoundParticipantUncheckedCreateInput) {
    const createData = {
      ...data,
      metrics: data.metrics === null ? Prisma.JsonNull : data.metrics,
    };

    const updateData = {
      completedAt: data.completedAt,
      failureReason: data.failureReason,
      metrics: data.metrics === null ? Prisma.JsonNull : data.metrics,
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

  async update(
    roundId: string,
    nodeId: string,
    data: Prisma.RoundParticipantUncheckedUpdateInput,
  ) {
    const updateData: Prisma.RoundParticipantUncheckedUpdateInput = {
      ...data,
      ...(data.metrics !== undefined && {
        metrics: data.metrics === null ? Prisma.JsonNull : data.metrics,
      }),
    };

    return this.prisma.roundParticipant.update({
      where: {
        roundId_nodeId: { roundId, nodeId },
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
