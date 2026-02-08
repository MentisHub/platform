import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NodeRefreshTokenService {
  constructor(private readonly prisma: PrismaService) {}

  async create(nodeId: string, expiresInDays: number = 30): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    await this.prisma.nodeRefreshToken.create({
      data: {
        token,
        nodeId,
        expiresAt,
      },
    });

    return token;
  }

  async validate(token: string): Promise<string | null> {
    const refreshToken = await this.prisma.nodeRefreshToken.findUnique({
      where: { token },
    });

    if (!refreshToken) return null;
    if (refreshToken.revokedAt) return null;
    if (refreshToken.expiresAt < new Date()) return null;

    return refreshToken.nodeId;
  }

  async revoke(token: string): Promise<void> {
    await this.prisma.nodeRefreshToken.updateMany({
      where: { token, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForNode(nodeId: string): Promise<void> {
    await this.prisma.nodeRefreshToken.updateMany({
      where: { nodeId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async rotate(oldToken: string): Promise<string | null> {
    const nodeId = await this.validate(oldToken);
    if (!nodeId) return null;

    await this.revoke(oldToken);
    return this.create(nodeId);
  }
}
