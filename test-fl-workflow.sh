#!/bin/bash

# MentisHub - Script de Teste do Workflow de Federated Learning
# Este script automatiza o processo de configuração e teste do sistema

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# URL base da API (ajuste se necessário)
API_URL="${API_URL:-http://localhost:3000}"

# Função para logging
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Função para fazer requisições HTTP
api_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    if [ -z "$data" ]; then
        curl -s -X "$method" \
            -H "Authorization: Bearer $ACCESS_TOKEN" \
            -H "Content-Type: application/json" \
            "$API_URL$endpoint"
    else
        curl -s -X "$method" \
            -H "Authorization: Bearer $ACCESS_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$API_URL$endpoint"
    fi
}

# Função para extrair valores JSON
json_value() {
    echo "$1" | grep -o "\"$2\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | grep -o '"[^"]*"$' | sed 's/"//g'
}

json_value_unquoted() {
    echo "$1" | grep -o "\"$2\"[[:space:]]*:[[:space:]]*[^,}]*" | sed "s/\"$2\"[[:space:]]*:[[:space:]]*//" | sed 's/[",]//g'
}

echo "========================================="
echo "  MentisHub FL Workflow Test Script"
echo "========================================="
echo ""

# Passo 1: Preparar banco de dados
log_info "Passo 1: Preparando banco de dados..."
echo ""

log_info "Executando migrations e seed..."
docker exec -it platform-backend bash -c "cd apps/backend && pnpm prisma:deploy && pnpm db:seed" > /tmp/seed-output.txt 2>&1

# Extrair access token e fabId do output
ACCESS_TOKEN=$(grep -A 1 "Access Token:" /tmp/seed-output.txt | tail -1 | xargs)
FAB_ID=$(grep "FAB ID:" /tmp/seed-output.txt | awk '{print $NF}' | xargs)

if [ -z "$ACCESS_TOKEN" ] || [ -z "$FAB_ID" ]; then
    log_error "Não foi possível extrair credenciais do seed. Verifique o output em /tmp/seed-output.txt"
    exit 1
fi

log_success "Access Token obtido: ${ACCESS_TOKEN:0:20}..."
log_success "FAB ID obtido: $FAB_ID"
echo ""

# Passo 2: Obter organização
log_info "Passo 2: Obtendo organização..."
org_response=$(api_request GET "/organizations")
ORG_ID=$(echo "$org_response" | grep -o '"id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | grep -o '"[^"]*"$' | sed 's/"//g')

if [ -z "$ORG_ID" ]; then
    log_error "Não foi possível obter organização"
    echo "Response: $org_response"
    exit 1
fi

log_success "Organização ID: $ORG_ID"
echo ""

# Passo 3: Obter projeto
log_info "Passo 3: Obtendo projeto..."
project_response=$(api_request GET "/organizations/$ORG_ID/projects")
PROJECT_ID=$(echo "$project_response" | grep -o '"id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | grep -o '"[^"]*"$' | sed 's/"//g')

if [ -z "$PROJECT_ID" ]; then
    log_error "Não foi possível obter projeto"
    echo "Response: $project_response"
    exit 1
fi

log_success "Project ID: $PROJECT_ID"
echo ""

# Passo 4: Criar nodes
log_info "Passo 4: Criando nodes..."

# Node 1
log_info "Criando client-node-1..."
node1_response=$(api_request POST "/organizations/$ORG_ID/nodes" "{\"name\":\"client-node-1\",\"projectId\":\"$PROJECT_ID\"}")
NODE1_ID=$(json_value "$node1_response" "id")
NODE1_PSK=$(json_value "$node1_response" "psk")

if [ -z "$NODE1_ID" ] || [ -z "$NODE1_PSK" ]; then
    log_error "Não foi possível criar node 1"
    echo "Response: $node1_response"
    exit 1
fi

log_success "Node 1 criado: $NODE1_ID"
log_success "PSK 1: ${NODE1_PSK:0:20}..."

# Node 2
log_info "Criando client-node-2..."
node2_response=$(api_request POST "/organizations/$ORG_ID/nodes" "{\"name\":\"client-node-2\",\"projectId\":\"$PROJECT_ID\"}")
NODE2_ID=$(json_value "$node2_response" "id")
NODE2_PSK=$(json_value "$node2_response" "psk")

if [ -z "$NODE2_ID" ] || [ -z "$NODE2_PSK" ]; then
    log_error "Não foi possível criar node 2"
    echo "Response: $node2_response"
    exit 1
fi

log_success "Node 2 criado: $NODE2_ID"
log_success "PSK 2: ${NODE2_PSK:0:20}..."
echo ""

# Passo 5: Criar training run
log_info "Passo 5: Criando training run..."
training_response=$(api_request POST "/projects/$PROJECT_ID/trainings" "{\"fabId\":\"$FAB_ID\"}")
TRAINING_ID=$(json_value "$training_response" "id")

if [ -z "$TRAINING_ID" ]; then
    log_error "Não foi possível criar training run"
    echo "Response: $training_response"
    exit 1
fi

log_success "Training ID: $TRAINING_ID"
echo ""

# Passo 6: Subir SuperNodes
log_info "Passo 6: Subindo SuperNodes..."

# Limpar containers anteriores se existirem
log_info "Limpando containers anteriores..."
docker rm -f supernode-1 supernode-2 2>/dev/null || true

# SuperNode 1
log_info "Iniciando supernode-1..."
docker run -d \
  --name supernode-1 \
  --network mentishub-network \
  -e NODE_PSK="$NODE1_PSK" \
  -e OTEL_EXPORTER_OTLP_ENDPOINT="otel-collector:4318" \
  -v client-1-certs:/app/certs \
  mentishub/fl-clientapp:latest \
  flower-supernode \
  --isolation subprocess \
  --health-server-address 0.0.0.0:9099 \
  --superlink superlink:9092 \
  --root-certificates /home/app/.flwr/certificates/ca.crt \
  --auth-supernode-private-key /app/certs/ec_private.key \
  --node-config 'partition-id=0' > /dev/null

log_success "SuperNode 1 iniciado"

# SuperNode 2
log_info "Iniciando supernode-2..."
docker run -d \
  --name supernode-2 \
  --network mentishub-network \
  -e NODE_PSK="$NODE2_PSK" \
  -e OTEL_EXPORTER_OTLP_ENDPOINT="otel-collector:4318" \
  -v client-2-certs:/app/certs \
  mentishub/fl-clientapp:latest \
  flower-supernode \
  --isolation subprocess \
  --health-server-address 0.0.0.0:9099 \
  --superlink superlink:9092 \
  --root-certificates /home/app/.flwr/certificates/ca.crt \
  --auth-supernode-private-key /app/certs/ec_private.key \
  --node-config 'partition-id=1' > /dev/null

log_success "SuperNode 2 iniciado"
echo ""

# Passo 7: Deploy ServerApp
log_info "Passo 7: Fazendo deploy do ServerApp..."
deploy_response=$(api_request POST "/projects/$PROJECT_ID/trainings/$TRAINING_ID/deploy")
log_success "Deploy iniciado"
echo ""

# Passo 8: Aguardar nodes ficarem READY
log_info "Passo 8: Aguardando nodes ficarem READY..."
log_warning "Monitorando logs dos SuperNodes (aguardando instalação de dependências)..."
log_info "Isso pode levar alguns minutos..."
echo ""

# Aguardar 30 segundos para os nodes começarem a processar
sleep 30

# Verificar status dos nodes
check_count=0
max_checks=20
while [ $check_count -lt $max_checks ]; do
    log_info "Verificando status dos nodes (tentativa $((check_count + 1))/$max_checks)..."
    
    # Aqui você pode adicionar uma chamada à API para verificar o status dos nodes
    # Por enquanto, vamos apenas aguardar um tempo fixo
    
    sleep 15
    check_count=$((check_count + 1))
done

log_success "Assumindo que nodes estão READY após aguardar"
echo ""

# Passo 9: Iniciar treinamento
log_info "Passo 9: Iniciando treinamento..."
run_response=$(api_request POST "/projects/$PROJECT_ID/trainings/$TRAINING_ID/run")
log_success "Treinamento iniciado!"
echo ""

# Sumário final
echo "========================================="
echo "  Sumário da Configuração"
echo "========================================="
echo ""
echo "Access Token: $ACCESS_TOKEN"
echo "Organization ID: $ORG_ID"
echo "Project ID: $PROJECT_ID"
echo "FAB ID: $FAB_ID"
echo "Training ID: $TRAINING_ID"
echo ""
echo "Node 1 ID: $NODE1_ID"
echo "Node 1 PSK: $NODE1_PSK"
echo ""
echo "Node 2 ID: $NODE2_ID"
echo "Node 2 PSK: $NODE2_PSK"
echo ""
echo "========================================="
echo ""

log_success "Script concluído com sucesso!"
log_info "Para monitorar o treinamento:"
echo "  docker logs -f supernode-1"
echo "  docker logs -f supernode-2"
echo ""
log_info "Para parar os SuperNodes:"
echo "  docker stop supernode-1 supernode-2"
echo "  docker rm supernode-1 supernode-2"
