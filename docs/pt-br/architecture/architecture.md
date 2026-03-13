# Documento de Definição da Arquitetura

## 1. Diagrama Arquitetural

```mermaid
flowchart TB
    subgraph ExternalNodes["Nós Externos"]
        SN1["SuperNode 1\n(ClientApp)"]
        SN2["SuperNode 2\n(ClientApp)"]
    end

    subgraph FlowerLayer["Flower"]
        SL["SuperLink\n:9091–9093"]
        SA["ServerApp\n(container Docker)"]
        SA <--> SL
        SN1 -- mTLS --> SL
        SN2 -- mTLS --> SL
    end

    subgraph PlatformLayer["Platform"]
        FE["Frontend\nNext.js :3001"]
        BE["Backend\nNestJS :3000"]
        FE -- REST --> BE
    end

    subgraph SupabaseLayer["Supabase"]
        PG[("PostgreSQL")]
        AUTH["GoTrue Auth\n:9999"]
        STOR["Storage\n(bucket: fab)"]
        KONG["Kong Gateway\n:8000"]
        KONG --> AUTH
        KONG --> PG
    end

    subgraph ObsLayer["Observabilidade"]
        OTEL["OTel Collector\n:4317 mTLS / :4318"]
        PROM["Prometheus\n:9090"]
        GRAF["Grafana\n:3006"]
        OTEL --> PROM
        PROM --> GRAF
    end

    FE -- "JWT (Supabase)" --> AUTH

    BE -- "Prisma (SQL)" --> PG
    BE -- "Storage API" --> STOR
    BE -- "JWT validation" --> AUTH

    BE -- "gRPC (orquestração)" --> SL
    SL -- "StreamEvents gRPC" --> BE

    BE -- "dockerode" --> SA

    SN1 -. "POST /nodes/activate\n(bootstrap, HTTP, uso único)" .-> BE
    SN2 -. "POST /nodes/activate\n(bootstrap, HTTP, uso único)" .-> BE

    SN1 -- "OTLP gRPC (mTLS)" --> OTEL
    SN2 -- "OTLP gRPC (mTLS)" --> OTEL
    SA -- "OTLP gRPC (mTLS)" --> OTEL
    BE -- "OTLP gRPC (mTLS)" --> OTEL
```

---

## 2. Componentes

| Componente | Tecnologia | Porta(s) | Descrição |
|---|---|---|---|
| **Backend** | NestJS 11 (Node.js 25) | 3000 | API REST versionada (URI v1), orquestração de treinamento, emissão de certificados, integração Flower |
| **Frontend** | Next.js 16, React 19 | 3001 | Interface do usuário |
| **SuperLink** | Flower (fork `mentishub`) | 9091–9093 | Coordenador central da federação; gRPC para ServerApp, ClientApps e Backend |
| **ServerApp** | Python, Flower | — | Container Docker gerenciado pela plataforma via `dockerode`; executa estratégia FL |
| **ClientApp / SuperNode** | Python, Flower, PyTorch | — | Nó externo; executa treinamento local; conecta-se ao SuperLink via mTLS |
| **PostgreSQL (Supabase)** | supabase/postgres 17 | 5432 | Banco de dados principal; schema `platform` |
| **Supabase Auth** | GoTrue | 9999 | Autenticação de usuários (JWT) |
| **Supabase Storage** | storage-api | 5000 | Armazenamento de FABs (bucket `fab`) |
| **Kong** | Kong 3.x | 8000 / 8443 | Gateway da API Supabase |
| **OTel Collector** | otel-contrib | 4317 / 4318 | Recebe telemetria (mTLS obrigatório na 4317); exporta para Prometheus |
| **Prometheus** | Prometheus 3.x | 9090 | Backend de métricas |
| **Grafana** | Grafana 12 | 3006 | Dashboards de observabilidade |

---

## 3. Fluxos Principais

### 3.1 Bootstrap de Nó

```mermaid
sequenceDiagram
    participant No as Nó (SuperNode)
    participant BE as Backend
    participant SL as SuperLink

    No->>No: gera par ECDSA P-384
    No->>BE: POST /nodes/activate<br/>{ psk, ecPublicKey }
    BE->>BE: valida PSK (SHA-256 hash)
    BE->>BE: registra ecPublicKey, seta activatedAt
    BE->>BE: emite cert X.509 (7d, CN=nodeId)
    BE->>SL: registra nó na federação (gRPC)
    BE-->>No: { clientCert, rootCa }
    No->>SL: conecta via mTLS<br/>(sem mais contato com Backend)
```

### 3.2 Ciclo de Treinamento

```mermaid
sequenceDiagram
    participant U as Usuário
    participant BE as Backend
    participant DS as Supabase Storage
    participant DK as Docker
    participant SA as ServerApp
    participant SL as SuperLink
    participant SN as SuperNodes

    U->>BE: POST /trainings (PENDING)
    U->>BE: POST /trainings/{id}/deploy
    BE->>DK: inicia container ServerApp<br/>(NODE_PSK injetado)
    DK-->>SA: container iniciado
    SA->>BE: POST /nodes/activate (bootstrap interno)
    BE-->>SA: { clientCert, rootCa }
    BE-->>U: status → READY

    U->>BE: POST /trainings/{id}/run
    BE->>DS: baixa FAB
    DS-->>BE: conteúdo .fab
    BE->>SL: startRun (gRPC + FAB)
    BE->>SN: status → TRAINING

    loop Rodadas de Treinamento
        SL->>SA: coordena estratégia
        SL->>SN: distribui tarefas
        SN-->>SL: resultados locais
        SA-->>SL: agrega modelo
        SL-->>BE: StreamEvents (round/node events)
        BE->>BE: atualiza Round, Node no DB
    end

    SL-->>BE: StreamEvents (RUN_COMPLETED)
    BE->>BE: status → COMPLETED
```

### 3.3 Renovação de Certificado

```mermaid
sequenceDiagram
    participant No as Nó
    participant BE as Backend

    No->>No: gera challenge (timestamp:nonce)
    No->>No: assina challenge com chave ECDSA P-384<br/>(formato OpenSSH)
    No->>BE: POST /nodes/rotate<br/>{ nodeId, challenge, signature }
    BE->>BE: verifica assinatura ECDSA P-384
    BE->>BE: emite novo cert X.509 (7d)
    BE-->>No: { clientCert, rootCa }
```

---

## 4. Segurança e Autenticação

| Caminho | Mecanismo |
|---|---|
| Usuário → Backend | Supabase JWT; validado pelo `APP_GUARD` global |
| Nó → Backend (bootstrap) | PSK `{base32NodeId}.{base64urlSecret}` — uso único |
| Nó → Backend (renovação) | Challenge-response ECDSA P-384 (OpenSSH signature) |
| Nó / ServerApp → SuperLink | mTLS com cert X.509 emitido pela Root CA da plataforma |
| Backend → SuperLink | gRPC com cert de serviço da plataforma |
| Todos → OTel Collector | mTLS obrigatório (porta 4317) |

**PKI:** Root CA única para toda a plataforma (`@peculiar/x509`). Certs de nós: TTL 7 dias, `CN={nodeId}`, SAN `spiffe://mentishub/node/{nodeId}`. Sem CAs intermediárias por organização.

---

## 5. Rede

Todos os serviços operam na rede Docker `mentishub-network`. Comunicação entre serviços usa hostnames de serviço — nunca `localhost`. Portas expostas ao host somente para desenvolvimento.
