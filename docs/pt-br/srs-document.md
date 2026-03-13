# Documento de Especificação de Requisitos

# 1. Introdução

---

# 2. Requisitos Funcionais

## RF-P01: Gerenciamento de Organizações

**Dependências:** —

### RF-P01.1: Cadastro de Organização

* Deve ser informado um nome da organização.
* O nome da organização deve ser único no sistema.
* O usuário criador deve ser definido como **dono** da organização.
* A organização padrão é criada automaticamente no momento da criação da conta.

### RF-P01.2: Edição de Organização

* É permitido editar o nome da organização.
* Somente donos ou administradores da organização podem editar esses dados.

### RF-P01.3: Exclusão de Organização

* A exclusão da organização deve ser bloqueada se existir **algum projeto ativo** associado a ela.
* A operação deve exigir confirmação explícita do dono da organização.

---

## RF-P02: Gerenciamento de Nós

**Dependências:** RF-P01

### RF-P02.1: Cadastro de Nó

* Deve ser informado o nome do nó (auto-gerado quando não fornecido).
* No momento da criação, o sistema deve gerar um **PSK (pre-shared key)** de uso único, exibido apenas uma vez.
* O PSK deve:
  * ser emitido no formato `{nodeIdBase32}.{segredo}`, onde `nodeIdBase32` é o UUID do nó codificado em base32 e `segredo` é uma string aleatória de 22 caracteres em base64url (16 bytes de entropia);
  * somente o hash SHA-256 do segredo é armazenado no banco de dados — o valor original nunca é persistido;
  * permitir somente a autenticação inicial do nó para emissão de certificados (uso único).
* O sistema deve registrar a data de criação do nó e o administrador responsável.
* O PSK é invalidado após o primeiro uso (bootstrap bem-sucedido); tentativas subsequentes com o mesmo PSK são rejeitadas com erro 401.

### RF-P02.2: Edição de Nó

* É permitido editar o nome do nó.
* Alterações de nome não devem alterar o identificador interno do nó.

### RF-P02.3: Exclusão de Nó

* A exclusão deve ser bloqueada quando o nó estiver vinculado a treinamentos ativos.
* A exclusão é definitiva.

### RF-P02.4: Visualização de Nó

* Para cada nó, o sistema deve exibir:
  * nome
  * status: `CREATED` | `INITIALIZING` | `READY` | `TRAINING` | `ERROR` | `OFFLINE`
  * última atividade (`lastActiveAt`)

### RF-P02.5: Registro e Autenticação de Aplicações de Treinamento

* O `ServerApp` é tratado como um nó lógico interno da plataforma.
* O backend cria o nó do ServerApp, realiza o bootstrap internamente e injeta o PSK gerado como variável de ambiente no container antes de iniciá-lo.
* O `ServerApp` comunica-se com o SuperLink exclusivamente via mTLS após o bootstrap.
* A plataforma deve rejeitar qualquer comunicação de processos que não apresentem certificados válidos emitidos pela CA da plataforma.

### RF-P02.6: Processo de Bootstrap e Emissão de Certificados mTLS

**Critérios de Aceitação**

* Antes do bootstrap, o nó deve gerar localmente um par de chaves **ECDSA P-384** (chave privada em formato OpenSSH, chave pública em formato PEM PKCS#8).
* O nó deve iniciar o bootstrap enviando ao endpoint público `POST /nodes/activate`:
  * `psk`: string no formato `{nodeIdBase32}.{segredo}`;
  * `ecPublicKey`: chave pública ECDSA P-384 em PEM, codificada em base64 (linha única).
* O backend deve validar:
  * o PSK: extrair `nodeIdBase32`, converter para UUID, localizar o nó, comparar SHA-256 do segredo com o hash armazenado;
  * se o PSK já foi utilizado (campo `activatedAt` preenchido).
* Após validação bem-sucedida, o backend deve:
  * registrar a chave pública no cadastro do nó;
  * definir `activatedAt` com o timestamp atual (invalidando o PSK para reuso);
  * emitir um certificado X.509 client com TTL de **7 dias**, assinado pela Root CA da plataforma, com `CN={nodeId}` e SAN `spiffe://mentishub/node/{nodeId}`;
  * registrar o nó no Flower SuperLink.
* O backend deve retornar:
  * `clientCert`: certificado X.509 do nó em PEM;
  * `rootCa`: certificado da Root CA da plataforma em PEM.
* Após receber os certificados, o nó deve usar exclusivamente mTLS para todas as conexões com o SuperLink.
* Renovação de certificado ocorre via `POST /nodes/rotate` com prova de posse (ver RF-P06.2).

---

## RF-P03: Gerenciamento de Projetos

**Dependências:** RF-P01, RF-P02

### RF-P03.1: Cadastro de Projeto

* Deve ser informado o nome do projeto.
* O sistema deve gerar um identificador único para o projeto.
* O sistema deve permitir associar organizações convidadas ao projeto.
* No cadastro de usuário, o sistema deve criar automaticamente um **projeto padrão** associado à organização padrão do usuário.

### RF-P03.2: Edição de Projeto

* É permitido editar:
  * nome
  * lista de organizações colaboradoras (participantes do projeto)

### RF-P03.3: Exclusão de Projeto

* A exclusão do projeto deve ser bloqueada se houver treinamentos ativos associados a ele.
* A ação deve exigir confirmação explícita do administrador do projeto.

### RF-P03.4: Colaboração Multi-Organizacional

* O sistema deve permitir **convidar organizações externas** para participar do projeto.
* A organização convidada deve **aceitar explicitamente** o convite para participar.
* Devem existir papéis de acesso no contexto do projeto, no mínimo:
  * administrador
  * colaborador
  * observador
* Métricas **agregadas de projeto** podem ser disponibilizadas para todos os participantes.

---

## RF-P04: Gerenciamento de FABs

**Dependências:** RF-P01, RF-P03

Um **FAB (Federated Application Bundle)** é um pacote `.fab` contendo o código da aplicação federada (ServerApp + ClientApp), gerado pelo comando `flwr build`. É identificado de forma única pelo seu hash SHA-256 de conteúdo.

### RF-P04.1: Upload de FAB

* Administradores de organização podem fazer upload de um FAB via `POST /organizations/{organizationId}/fabs` (multipart/form-data).
* Os campos obrigatórios são: arquivo `.fab`, nome, hash SHA-256, versão (semver).
* FABs com o mesmo hash SHA-256 são deduplicados automaticamente.
* O arquivo é armazenado no Supabase Storage (bucket `fab`) no caminho `organizations/{organizationId}/{fabHash}-{version}.fab`.
* Um FAB pode ser marcado como público (visível para todas as organizações) ou associado a um projeto específico.
* Administradores da plataforma podem fazer upload de **FABs padrão** via `POST /fabs/default`, disponíveis globalmente.

### RF-P04.2: Listagem e Download de FAB

* Membros da organização podem listar e baixar FABs de sua organização.
* FABs padrão e FABs públicos são acessíveis a todas as organizações.
* O download retorna o binário `.fab` original.

---

## RF-P05: Orquestração de Treinamento

**Dependências:** RF-P02, RF-P03, RF-P04

### RF-P05.1: Criação de Execução de Treinamento

* A criação de um treinamento requer a seleção de um FAB válido e acessível.
* Uma execução de treinamento é criada com status `PENDING` e associada ao projeto correspondente.

### RF-P05.2: Implantação do ServerApp

* Antes de iniciar o treinamento, o sistema deve implantar o `ServerApp` via `POST /projects/{projectId}/trainings/{trainingId}/deploy`:
  * Um nó lógico interno é criado para o ServerApp;
  * O sistema gera um PSK para esse nó e inicia um container Docker (`mentishub/fl-serverapp:latest`) na rede `mentishub-network`, injetando o PSK como variável de ambiente;
  * O container executa o bootstrap automaticamente ao iniciar;
  * O status do treinamento avança: `PENDING` → `DEPLOYING` → `READY`.
* Em caso de falha na implantação, o sistema deve realizar rollback (remover container e nó criados, retornar status a `PENDING`).

### RF-P05.3: Início da Execução de Treinamento

* O treinamento é iniciado via `POST /projects/{projectId}/trainings/{trainingId}/run`:
  * O sistema valida que há nós no status `READY` (sem nós em `INITIALIZING` ou `TRAINING`);
  * O FAB é baixado do Supabase Storage e enviado ao Flower SuperLink via gRPC;
  * O SuperLink inicia a execução federada; todos os nós `READY` são atualizados para `TRAINING`;
  * O status do treinamento avança para `RUNNING`.
* Nós offline ou em erro no momento da execução são automaticamente excluídos da rodada.

### RF-P05.4: Ciclo de Vida de Rodadas

* O sistema deve registrar, para cada rodada (`Round`):
  * número da rodada e status (`STARTED` | `FITTING` | `FIT_FAILED` | `AGGREGATING` | `EVALUATING` | `EVALUATE_AGGREGATING` | `EVALUATE_FAILED` | `FAILED` | `COMPLETED`);
  * lista de nós participantes (`RoundParticipant`).
* As atualizações de status são recebidas via stream de eventos do Flower SuperLink (RF-P07.2).

### RF-P05.5: Controle de Execução

* Deve ser possível cancelar o treinamento.
* O status do treinamento deve ser atualizado adequadamente (`CANCELLED`).

### RF-P05.6: Status de Execução de Treinamento

Os possíveis status de uma execução de treinamento são:
`PENDING` | `DEPLOYING` | `READY` | `RUNNING` | `PAUSED` | `COMPLETED` | `FAILED` | `CANCELLED`

---

## RF-P06 – Infraestrutura de PKI e Emissão de Certificados

**Dependências:** —

### RF-P06.1: Estrutura da PKI

* A plataforma mantém uma **Root CA única**, compartilhada por toda a instalação.
* A chave privada da Root CA é armazenada no sistema de arquivos do backend, protegida por controles de acesso do SO.
* Não há CAs intermediárias por organização — todos os certificados de nós são emitidos diretamente pela Root CA da plataforma.
* Certificados são gerados programaticamente usando a biblioteca `@peculiar/x509`.

### RF-P06.2: Emissão e Renovação de Certificados

* Certificados de nós são emitidos pela Root CA da plataforma após bootstrap bem-sucedido (RF-P02.6).
* **TTL padrão:** 7 dias.
* Certificados incluem:
  * `CN={nodeId}` como subject;
  * `spiffe://mentishub/node/{nodeId}` como SAN URI;
  * extensões `KeyUsage: digitalSignature | keyEncipherment` e `ExtendedKeyUsage: clientAuth`.
* **Renovação** ocorre via `POST /nodes/rotate` com prova de posse:
  * O nó envia: `nodeId`, `challenge` (formato `timestamp:nonce`), `signature` (assinatura OpenSSH do challenge com a chave privada ECDSA P-384 do nó);
  * O backend verifica a assinatura ECDSA usando a chave pública registrada no bootstrap;
  * Se válida, um novo certificado é emitido com o mesmo TTL.
* Não há revogação explícita de certificados individuais; o controle de acesso é feito via status do nó no banco de dados.

### RF-P06.3: Ciclo de Vida e Expiração

* O backend é a fonte de verdade para datas de emissão dos certificados (armazenadas no cadastro do nó).
* Nós que não renovarem seus certificados dentro do prazo devem ser marcados como `OFFLINE` ou `ERROR`.

---

## RF-P07: Monitoramento e Observabilidade

**Dependências:** RF-P03, RF-P05

### RF-P07.1: Monitoramento Global de Nós

* O sistema deve exibir, em uma visão global de nós:
  * status (`CREATED` | `INITIALIZING` | `READY` | `TRAINING` | `ERROR` | `OFFLINE`)
  * última atividade (`lastActiveAt`)
* Essa visão é independente de um treinamento específico.

### RF-P07.2: Stream de Eventos do Flower

* O backend deve manter uma conexão gRPC persistente com o SuperLink (`StreamEvents`) para receber eventos de ciclo de vida em tempo real.
* Os eventos recebidos devem disparar atualizações internas via `EventEmitter2` e refletir no status de `TrainingRun`, `Round` e `Node` no banco de dados.
* Tipos de eventos mapeados:
  * **Execução:** `RUN_STARTED`, `RUN_COMPLETED`, `RUN_FAILED`
  * **Rodada:** `ROUND_STARTED`, `ROUND_FIT_STARTED`, `ROUND_FIT_AGGREGATED`, `ROUND_FIT_FAILED`, `ROUND_EVALUATE_STARTED`, `ROUND_EVALUATE_AGGREGATED`, `ROUND_EVALUATE_FAILED`, `ROUND_COMPLETED`, `ROUND_FAILED`
  * **Nó:** `NODE_FIT_STARTED`, `NODE_FIT_COMPLETED`, `NODE_FIT_FAILED`, `NODE_EVALUATE_STARTED`, `NODE_EVALUATE_COMPLETED`, `NODE_EVALUATE_FAILED`, `NODE_CONNECTED`, `NODE_DISCONNECTED`
* A conexão deve se reconectar automaticamente em caso de encerramento (5 s se limpo, 10 s se por erro).

### RF-P07.3: Monitoramento de Treinamentos

* Para um treinamento selecionado, o sistema deve exibir:
  * identificador da execução e projeto associado
  * status atual, rodada atual e total de rodadas previstas
  * métricas agregadas por rodada (loss, accuracy)
* Para cada rodada, deve ser possível ver:
  * lista de nós participantes e seus status

### RF-P07.4: Coleta de Telemetria via OTEL

* A plataforma deve expor um endpoint OTLP-gRPC (porta 4317) com mTLS obrigatório para recebimento de métricas, logs e traces de ClientApp, ServerApp e do próprio backend.
* Somente conexões com certificados válidos emitidos pela CA da plataforma devem ser aceitas.
* O OTel Collector exporta métricas para Prometheus (porta 8889).
* Prometheus é consultado pelo Grafana para visualização dos dashboards.

---

# 3. Requisitos Não Funcionais

## RNF-P01: Performance

---

## RNF-P02: Segurança

---

## RNF-P03: Escalabilidade

---

## RNF-P04: Disponibilidade

---

## RNF-P05: Usabilidade

---

## RNF-P06: Compatibilidade

---

# 4. Glossário

| Termo | Definição |
|---|---|
| **FAB** | Federated Application Bundle — pacote `.fab` contendo ServerApp + ClientApp, gerado por `flwr build` e identificado pelo hash SHA-256 do conteúdo. |
| **PSK** | Pre-Shared Key — credencial de uso único emitida pela plataforma no formato `{nodeIdBase32}.{segredo}`, usada somente no bootstrap do nó. |
| **SuperLink** | Componente central do Flower responsável por coordenar a federação entre ServerApp e ClientApps via gRPC/mTLS. |
| **ServerApp** | Processo que executa a estratégia de aprendizado federado (ex.: FedAvg). Gerenciado pela plataforma como container Docker. |
| **ClientApp** | Processo executado em cada nó participante, responsável pelo treinamento local. |
| **Bootstrap** | Processo de ativação de um nó: geração de par de chaves ECDSA P-384 + envio ao backend + recebimento do certificado mTLS. |
| **mTLS** | Mutual TLS — autenticação mútua via certificados X.509, usada nas conexões nó ↔ SuperLink e backend ↔ OTEL Collector. |
| **Root CA** | Autoridade certificadora raiz da plataforma, responsável pela emissão de todos os certificados de nós. |

# 5. Referências
