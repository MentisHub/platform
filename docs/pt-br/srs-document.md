# Documento de Especificação de Requisitos

# 1. Introdução

---

# 2. Requisitos Funcionais

## RF-P01: Gerenciamento de Organizações

**Dependências:** RF-P01

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
* A exclusão deve ser realizada via **soft delete** com período de retenção de 30 dias.

---

## RF-P02: Gerenciamento de Nós

**Dependências:** RF-P01

### RF-P02.1: Cadastro de Nó

* Deve ser informado o nome do nó (auto-gerado quando não fornecido).
* No momento da criação, o sistema deve gerar um **PSK (pre-shared key)** de uso único, exibido apenas uma vez.
* O PSK deve:
  * ser uma string opaca adequada para autenticação segura;
  * permitir somente a autenticação inicial do nó para emissão de certificados.
* O sistema deve registrar a data de criação do nó, o administrador responsável e a expiração do PSK.
* Após expiração ou uso, o PSK deve ser invalidado.

### RF-P02.2: Edição de Nó

* É permitido editar o nome do nó.
* O sistema deve permitir **revogar certificados mTLS** emitidos para o nó.
* Alterações de nome não devem alterar o identificador interno do nó.
* Revogações devem ser registradas com timestamp e identificação do responsável.

### RF-P02.3: Exclusão de Nó

* A exclusão deve ser bloqueada quando o nó estiver vinculado a treinamentos ativos.
* Ao excluir um nó, o sistema deve:
  * revogar imediatamente o certificado mTLS correspondente;
* A exclusão é definitiva, sem necessidade de soft delete.

### RF-P02.4: Visualização de Nó

* Para cada nó, o sistema deve exibir:
  * nome
  * status (`running`, `online`, `offline`, `inativo`)
  * última atividade
  * recursos alocados (CPU, memória, GPU)
  * consumo atual desses recursos

### RF-P02.5: Registro e Autenticação de Aplicações de Treinamento

* Aplicações internas de treinamento, como o `ServerApp`, devem ser tratadas como nós lógicos.
* O backend deve gerar ou renovar os certificados mTLS necessários antes de iniciar os containers correspondentes, fornecendo-os via volume ou mecanismo equivalente.
* O `ServerApp` deve usar exclusivamente mTLS para:
  * envio de telemetria via OTLP
  * treinamento dos nós
* A plataforma deve rejeitar qualquer comunicação proveniente de processos que não apresentem certificados válidos emitidos por CAs da plataforma.

### RF-P02.6: Processo de Bootstrap e Emissão de Certificados mTLS

**Critérios de Aceitação**

* O nó deve iniciar o bootstrap enviando ao backend:
  * `node_id`
  * `psk`
* O backend deve validar:
  * integridade e prazo do PSK;
  * associação ao nó correspondente;
  * se o PSK já foi utilizado.
* Após validação:
  * o nó deve gerar localmente seu par de chaves;
  * deve gerar um **CSR** assinado pela chave privada;
  * deve enviar o CSR ao backend.
* O backend deve retornar:
  * certificado emitido para o nó;
  * certificado da CA intermediária da organização;
  * certificado da Root CA.
* Após receber os certificados, o nó deve:
  * usar exclusivamente mTLS para todas as conexões (OTLP, RPCs, APIs internas);
  * renovar certificados antes da expiração, enviando novos CSRs.
* Em caso de revogação, o nó deve ser impedido de estabelecer conexões até realizar novo bootstrap.

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
* Alterações na lista de organizações colaboradoras (entrada ou saída de participantes, mudança de papel) devem:
  * exigir confirmação explícita do administrador;
  * ser registradas em log de auditoria com timestamp e identificação do responsável.

### RF-P003.3: Exclusão de Projeto

* A exclusão do projeto deve ser bloqueada se houver treinamentos ativos associados a ele.
* A ação deve exigir confirmação explícita do administrador do projeto.
* A exclusão pode ser feita via **soft delete** com retação de 30 dias.

### RF-P03.4: Colaboração Multi-Organizacional

* O sistema deve permitir **convidar organizações externas** para participar do projeto.
* A organização convidada deve **aceitar explicitamente** o convite para participar.
* Devem existir papéis de acesso no contexto do projeto, no mínimo:
  * administrador
  * colaborador
  * observador
* Métricas **agregadas de projeto** podem ser disponibilizadas para todos os participantes.

---

## RF-P04: Orquestração de Treinamento

**Dependências:** RF-P02, RF-P03

### RF-P04.1: Configuração Padrão de Treinamento

* O sistema deve permitir criar **configurações de treinamento reutilizáveis** (templates), contendo, por exemplo:
  * modelo base ou referência ao modelo inicial
  * estratégia de treinamento federado/estratégia Flower
  * número mínimo de nós participantes
  * políticas de timeout e retries
* Essas configurações devem poder ser associadas a múltiplos projetos.
* Um projeto pode definir qual configuração padrão será utilizada quando um novo treinamento for iniciado.

### RF-P04.2: Configuração de Treinamento por Projeto e Início de Execução

* Ao iniciar um treinamento, o sistema deve permitir:
  * selecionar uma configuração padrão de treinamento (RF-P04.1);
  * sobrescrever parâmetros específicos ao projeto/execução, como:
    * número de rodadas
    * parâmetros de batch/épocas locais (quando aplicável)
* Antes de iniciar o treinamento, o sistema deve verificar:
  * se há **nós suficientes** para atender o número mínimo definido na configuração;
  * se esses nós estão **ativos e autenticados**.
* Nós que estiverem offline no momento da rodada devem ser automaticamente excluídos daquela rodada.
* Para cada rodada, o sistema deve registrar:
  * quais nós participaram
  * quais nós esperados falharam em participar e, se disponível, o motivo da falha
* Cada execução de treinamento deve ser única e ser associada ao projeto correspondente.

### RF-P04.3: Controle de Execução

* Deve ser possível:
  * pausar o treinamento
  * retomar o treinamento pausado
  * cancelar o treinamento
* Em caso de pausa ou cancelamento:
  * o sistema deve registrar o estado atual da execução;
  * o status do treinamento deve ser atualizado adequadamente (ex.: pausado, cancelado).
* As ações de pausa, retomada e cancelamento devem ser registradas com timestamp e identificação do usuário responsável.

### RF-P04.4: Persistência de Artefatos de Treinamento

* O sistema deve permitir armazenar de forma persistente, em um bucket S3 compatível:
  * modelos globais resultantes de cada rodada de agregação;
  * o modelo final da execução;
  * artefatos auxiliares relevantes (ex.: checkpoints opcionais).
* Cada artefato deve ser associado a:
  * identificação da execução;
  * projeto correspondente;
  * organização dona do projeto.
* O sistema deve permitir que usuários autorizados façam download dos artefatos.
* O sistema deve impedir que organizações que não participam do projeto acessem os arquivos armazenados.
* A exclusão de artefatos deve acompanhar a política de exclusão do projeto (RF-P03.3).

---

## RF-P05: Monitoramento e Observabilidade

**Dependências:** RF-P03, RF-P05

### RF-P05.1: Monitoramento Global de Nós

* O sistema deve exibir, em uma visão global de nós:
  * status (running/online/offline/inativo)
  * última atividade
  * uso atual de CPU, memória e GPU (visão resumida)
* Essa visão é independente de um treinamento específico (saúde geral do cluster / ambiente).

### RF-P05.2: Monitoramento de Treinamentos

* Para um treinamento selecionado, o sistema deve exibir:
  * identificador da execução
  * projeto associado
  * rodada atual e total de rodadas previstas
  * tempo decorrido e, se possível, estimativa de conclusão
  * métricas agregadas por rodada (por exemplo, loss, accuracy)
* Para cada rodada, deve ser possível ver:
  * lista de nós participantes
  * nós esperados que falharam e o motivo, quando disponível (conectividade, timeout, etc.)
* A partir da visão do treinamento, o usuário deve poder navegar até a visão de detalhes por nó (RF-P07.3).

### RF-P05.3: Visualização por Nó e Compartilhamento entre Organizações

* Para cada nó participante de um treinamento, o sistema deve exibir:
  * métricas locais relevantes (por exemplo, loss local, tempo de treino local);
  * gráficos de evolução dessas métricas ao longo das rodadas.

### RF-P05.4 – Coleta de Telemetria via OTEL

* A plataforma deve expor um endpoint OTLP para recebimento de:
  * métricas, logs e traces de ClientApp;
  * métricas, logs e traces de ServerApp;
  * métricas, logs e traces internas da plataforma.
* Cada dado recebido deve ser associado, quando aplicável, a:
  * nó de origem;
  * organização;
  * projeto ou execução de treinamento.
* Somente conexões autenticadas por mTLS com certificados válidos emitidos pela CA da plataforma devem ser aceitas.

### RF-P05.5 – Observabilidade

* O OTel Collector da plataforma deve ser capaz de exportar:
  * métricas para o backend de métricas (ex.: Prometheus);
  * logs para o backend de logs (ex.: Loki);
  * traces para o backend de traces (ex.: Tempo).
* O backend da aplicação deve conseguir consultar essas fontes de dados para:
  * alimentar as telas de monitoramento definidas em RF-P05.1, RF-P05.2 e RF-P05.3;
* Em caso de indisponibilidade temporária da stack de observabilidade, o sistema deve:
  * enfileirar ou agrupar a telemetria em memória ou armazenamento local até um limite configurável;
  * descartar dados excedentes de forma controlada, registrando estatísticas de perda quando ocorrer.

---

## RF-P06 – Infraestrutura de PKI e Emissão de Certificados

**Dependências:** RF-P03

### RF-P06.1: Estrutura da PKI

* A plataforma deve utilizar uma infraestrutura de PKI baseada no **HashiCorp Vault**, operando como responsável pela emissão, armazenamento seguro e gerenciamento do ciclo de vida de certificados.
* O Vault deve manter:
  * uma **Root CA**, utilizada exclusivamente para assinar CAs intermediárias;
  * uma **CA intermediária por organização**, responsável pela emissão dos certificados dos nós.
* O backend deve solicitar ao Vault a emissão de certificados, selecionando automaticamente a CA intermediária correspondente à organização.

### RF-P06.2: Emissão e Renovação de Certificados

* Certificados de nós devem ser emitidos apenas após:
  * validação do PSK e CSR no bootstrap (RF-P02.6), quando o nó é externo; ou
  * requisição interna para aplicações da própria plataforma (ex.: ServerApp).
* A renovação deve ocorrer por meio de:
  * envio de um novo CSR assinado com a chave privada atual; e
  * validação da assinatura pelo backend utilizando o Vault.
* O certificado deve estar válido no momento da renovação.
* Certificados emitidos devem incluir informações suficientes para:
  * identificar unicamente o nó;
  * associar o certificado à organização proprietária;
  * permitir extração de atributos para tagging de métricas.

### RF-P06.3: Revogação de Certificados

* A revogação deve ser solicitada pelo backend ao Vault e registrada com timestamp e identificação do responsável.
* Após a revogação:
  * conexões mTLS utilizando o certificado revogado devem ser rejeitadas imediatamente;
  * o nó deve ser obrigado a executar novamente o processo de bootstrap para obter novos certificados.

### RF-P06.4: Armazenamento Seguro das Chaves das CAs

* A **Root CA** e todas as **CAs intermediárias** devem ter:
  * suas chaves privadas armazenadas exclusivamente dentro do Vault;
  * proteção criptográfica e controles de acesso adequados;
  * política de acesso restrita apenas ao backend da plataforma.
* A rotação e criação de novas CAs intermediárias deve ocorrer sem afetar organizações existentes.
* Nenhuma chave privada deve ser exposta ao backend, aos nós ou a qualquer serviço fora do Vault.

### RF-P06.5: Ciclo de Vida e Expiração

* Certificados emitidos devem possuir validade definida pela plataforma.
* O Vault deve ser a fonte de verdade para:
  * datas de expiração;
  * listas de certificados válidos;
  * certificados revogados.
* O backend deve:
  * notificar nós com certificados próximos da expiração;
  * rejeitar conexões mTLS estabelecidas com certificados expirados ou revogados.
* Nós que não renovarem seus certificados dentro do prazo devem ser marcados como inativos.

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

# 5. Referências
