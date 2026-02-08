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

Como testar:

```
docker exec -it platform-backend bash
```

Rodar dentro do container:

```
cd apps/backend && pnpm prisma:deploy && pnpm db:seed
```

Lembre-se das seguintes informações, access token do primeiro usuário e o fabId gerado no seed
Usar o access token gerado (Authorization: Bearer) para chamar as rotas (salve como variável de ambiente):

Chamar o endpoint GET /organizations e pegar uma organização que o usuário é dono
Chamar o endpoint (2 vezes) POST /organizations/{organizationId}/nodes passando apenas um `name` aleatório, lembre-se do id dele e do seu PSK
Chamar o endpoint GET /organizations/{organizationId}/projects e pegar o id do projeto aleatório
Chamar o endpoint POST /projects/{projectId}/trainings com o fabId gerado no seed
Chamar o endpoint POST /projects/{projectId}/trainings/{trainingId}/nodes passando o nodesId criados

Subir esses nodes usando o PSK
docker run \
  --name supernode-1 \
  --network mentishub-network \
  -e NODE_PSK="XXXXXXX" \
  -e OTEL_EXPORTER_OTLP_ENDPOINT="otel-collector:4318" \
  -v client-1-certs:/app/certs \
  mentishub/fl-clientapp:latest \
  flower-supernode \
  --isolation subprocess \
  --health-server-address 0.0.0.0:9099 \
  --superlink superlink:9092 \
  --root-certificates /home/app/.flwr/certificates/ca.crt \
  --auth-supernode-private-key /app/certs/ec_private.key \
  --node-config 'partition-id=0'

docker run \
  --name supernode-2 \
  --network mentishub-network \
  -e NODE_PSK="XXXXXXX" \
  -e OTEL_EXPORTER_OTLP_ENDPOINT="otel-collector:4318" \
  -v client-2-certs:/app/certs \
  mentishub/fl-clientapp:latest \
  flower-supernode \
  --isolation subprocess \
  --health-server-address 0.0.0.0:9099 \
  --superlink superlink:9092 \
  --root-certificates /home/app/.flwr/certificates/ca.crt \
  --auth-supernode-private-key /app/certs/ec_private.key \
  --node-config 'partition-id=1'

Chamar o endpoint POST /projects/{projectId}/trainings/{trainingId}/deploy
Aguardar até que ambos instalem suas dependências

Chamar o endpoint POST /projects/{projectId}/trainings/{trainingId}/run
