import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RoundService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertRound(data: Prisma.RoundUncheckedCreateInput) {
    return await this.prisma.round.upsert({
      where: {
        runId_number: {
          runId: data.runId,
          number: data.number,
        },
      },
      create: data,
      update: data,
    });
  }

  async updateRound(roundId: string, data: Prisma.RoundUncheckedUpdateInput) {
    const updateData = {
      ...data,
      metrics: data.metrics === null ? Prisma.JsonNull : data.metrics,
    };

    return this.prisma.round.update({
      where: { id: roundId },
      data: updateData,
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
