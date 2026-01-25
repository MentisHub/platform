```sh
docker compose -f docker/compose/docker-compose.dev.yml --env-file docker/env/.env.dev up
```

```sh
docker exec -it platform-backend bash
```

```sh
cd apps/backend && pnpm prisma:deploy && pnpm db:seed
```

```sh
docker exec -i supabase-db psql -U postgres -d postgres -c "SELECT id FROM platform.projects WHERE organization_id = 'dff63f6e-220e-4898-b9e7-b28fdee05ff5';"
```
