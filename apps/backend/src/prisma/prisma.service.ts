import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor(private configService: ConfigService) {
    const pool = new Pool({
      connectionString: configService.getOrThrow<string>(
        'SERVICE_DATABASE_URL',
      ),
    });

    super({
      adapter: new PrismaPg(pool),
    });
  }
}
