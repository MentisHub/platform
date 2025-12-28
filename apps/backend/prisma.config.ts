import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema',
  migrations: {
    path: 'prisma/migrations',
    seed: 'prisma/seed',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
