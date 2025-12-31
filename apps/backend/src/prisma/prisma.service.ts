import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from 'prisma/generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor(private configService: ConfigService) {
    const pool = new Pool({
      connectionString: configService.get<string>('SERVICE_DATABASE_URL'),
    });

    super({
      adapter: new PrismaPg(pool),
    });
  }
}
