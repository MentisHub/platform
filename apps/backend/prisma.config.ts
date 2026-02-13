import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema',
  migrations: {
    path: 'prisma/migrations',
    seed: 'prisma/seed',
  },
  datasource: {
    url:
      process.env.DATABASE_URL ??
      'postgres://postgres:postgres@localhost:5432/postgres',
  },
});
