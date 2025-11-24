# Documento de Especificação de Requisitos

# 1. Introdução

---

# 2. Requisitos Funcionais

### RF001 – Gerenciamento de Usuário

**Prioridade:** Deve ter

**Dependências:** Nenhuma

#### RF001.1 – Cadastro de Usuário

**Critérios de Aceitação**

* O sistema deve exigir os campos obrigatórios:
  * nome
  * email
  * senha
* O email deve ser único no sistema e validado quanto ao formato.
* A senha deve ter no mínimo 10 caracteres, contendo:
  * letras maiúsculas
  * letras minúsculas
  * números
  * caracteres especiais
* Após o cadastro, o sistema deve enviar um link de confirmação para o email informado.
* O link de confirmação deve ter validade máxima de **1 hora**.
* A conta deve permanecer inativa até a confirmação do email.
* Após a confirmação do email:
  * o sistema deve criar automaticamente uma **organização padrão** associada ao usuário;
  * o usuário deve ser definido como **dono** dessa organização;
  * o sistema deve criar automaticamente um **projeto padrão** associado à organização padrão.

#### RF001.2 – Edição de Usuário

**Critérios de Aceitação**

* É permitido editar:
  * nome
  * email
  * senha
* Para alterar o email, o sistema deve:
  * exigir a senha atual do usuário;
  * enviar um novo link de confirmação para o email informado, com validade máxima de 1 hora;
  * somente aplicar a alteração após a confirmação do novo email.
* Para alterar a senha, o sistema deve:
  * exigir a senha atual;
  * exigir que a nova senha atenda à mesma política de complexidade do cadastro.
* As seguintes operações devem ser registradas em log, com timestamp e identificação do usuário:
  * alteração de email
  * alteração de senha

#### RF001.3 – Exclusão de Usuário

**Critérios de Aceitação**

* A exclusão da conta deve exigir a confirmação da senha atual.
* A exclusão deve ser bloqueada se o usuário for o **último dono** de alguma organização.
* O sistema deve realizar **soft delete** da conta com período de retenção de 14 dias.
* Durante o período de retenção, o usuário deve poder solicitar a restauração da conta.
* Após 14 dias, os dados do usuário devem ser removidos definitivamente, exceto registros mínimos necessários para auditoria e integridade de referências.
* A operação de exclusão deve ser registrada em log, com timestamp e identificação do usuário.

---

### RF002 – Gerenciamento de Organizações

**Prioridade:** Deve ter

**Dependências:** RF001

#### RF002.1 – Cadastro de Organização

**Critérios de Aceitação**

* Deve ser informado um nome da organização.
* O nome da organização deve ser único no sistema.
* O usuário criador deve ser definido como **dono** da organização.
* A organização padrão é criada automaticamente no momento de confirmação da conta (conforme RF001.1); este requisito cobre criações adicionais feitas pelo usuário.

#### RF002.2 – Edição de Organização

**Critérios de Aceitação**

* É permitido editar o nome da organização.
* Somente donos ou administradores da organização podem editar esses dados.

#### RF002.3 – Exclusão de Organização

**Critérios de Aceitação**

* A exclusão da organização deve ser bloqueada se existir **algum projeto ativo** associado a ela.
* A operação deve exigir confirmação explícita do dono da organização.
* A exclusão deve ser realizada via **soft delete** com período de retenção de 30 dias.
* Após 30 dias, os dados da organização e de seus projetos devem ser removidos definitivamente, exceto registros mínimos necessários para auditoria.

---

### RF003 – Gerenciamento de Nós

**Prioridade:** Deve ter

**Dependências:** RF001, RF002

#### RF003.1 – Cadastro de Nó

**Critérios de Aceitação**

* Deve ser informado o nome do nó (auto-gerado quando não fornecido).
* No momento da criação, o sistema deve gerar um **PSK (pre-shared key)** de uso único, exibido apenas uma vez ao administrador.
* O PSK deve:
  * ser uma string opaca adequada para autenticação segura;
  * permitir somente o **bootstrap inicial** do nó para emissão de certificados.
* O sistema deve registrar a data de criação do nó, o administrador responsável e a expiração do PSK.
* Após expiração ou uso, o PSK deve ser invalidado.

#### RF003.2 – Edição de Nó

**Critérios de Aceitação**

* É permitido editar o nome do nó.
* O sistema deve permitir **revogar certificados mTLS** emitidos para o nó.
* A revogação deve impedir novas conexões mTLS, exigindo novo processo de bootstrap.
* Alterações de nome não devem alterar o identificador interno do nó.
* Revogações devem ser registradas com timestamp e identificação do responsável.

#### RF003.3 – Exclusão de Nó

**Critérios de Aceitação**

* A exclusão deve ser bloqueada quando o nó estiver vinculado a treinamentos ativos.
* Ao excluir um nó, o sistema deve:
  * revogar imediatamente o certificado mTLS correspondente;
  * invalidar qualquer bootstrap pendente.
* A exclusão pode ser definitiva, sem necessidade de soft delete.

### RF003.4 – Visualização de Nó

**Critérios de Aceitação**

* Para cada nó, o sistema deve exibir:
  * nome
  * status (`running`, `online`, `offline`, `inativo`)
  * última atividade
  * recursos alocados (CPU, memória, GPU)
  * consumo atual desses recursos
* A listagem deve permitir ordenação por:
  * status
  * nome
  * última atividade
* Detalhes aprofundados podem ser exibidos em dashboards específicos.

#### RF003.5 – Registro e Autenticação de Aplicações de Treinamento

**Critérios de Aceitação**

* Aplicações internas de treinamento, como o `ServerApp`, devem ser tratadas como nós lógicos.
* O backend deve gerar ou renovar os certificados mTLS necessários antes de iniciar os containers correspondentes, fornecendo-os via volume ou mecanismo equivalente.
* O `ServerApp` deve usar exclusivamente mTLS para:
  * envio de telemetria via OTLP
  * comunicação RPC com o backend
  * envio de eventos de treinamento
* A plataforma deve rejeitar qualquer comunicação proveniente de processos que não apresentem certificados válidos emitidos por CAs da plataforma.


## RF003.6 – Processo de Bootstrap e Emissão de Certificados mTLS

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

### RF004 – Gerenciamento de Projetos

**Prioridade:** Deve ter

**Dependências:** RF001, RF002

#### RF004.1 – Cadastro de Projeto

**Critérios de Aceitação**

* Deve ser informado o nome do projeto.
* O sistema deve gerar um **identificador único para o projeto**, que pode ser editável (por exemplo, um “slug” amigável).
* O administrador criador deve ser registrado como **responsável inicial** pelo projeto.
* O sistema deve permitir associar organizações convidadas ao projeto.
* No cadastro de usuário (RF001.1), o sistema deve criar automaticamente um **projeto padrão** associado à organização padrão do usuário.

#### RF004.2 – Edição de Projeto

**Critérios de Aceitação**

* É permitido editar:
  * nome
  * lista de organizações colaboradoras (participantes do projeto)
* Alterações na lista de organizações colaboradoras (entrada ou saída de participantes, mudança de papel) devem:
  * exigir confirmação explícita do administrador;
  * ser registradas em log de auditoria com timestamp e identificação do responsável.

#### RF004.3 – Exclusão de Projeto

**Critérios de Aceitação**

* A exclusão do projeto deve ser bloqueada se houver treinamentos ativos associados a ele.
* A ação deve exigir confirmação explícita do administrador do projeto.
* A exclusão pode ser feita via **soft delete** com retação de 30 dias.
* Após 30 dias, os dados do projeto devem ser removidos definitivamente, exceto registros mínimos necessários para auditoria.

#### RF004.4 – Colaboração Multi-Organizacional

**Critérios de Aceitação**

* O sistema deve permitir **convidar organizações externas** para participar do projeto.
* A organização convidada deve **aceitar explicitamente** o convite para participar.
* Devem existir papéis de acesso no contexto do projeto, no mínimo:
  * administrador
  * colaborador
  * observador
* Cada organização deve ter acesso apenas:
  * aos seus próprios nós
  * às suas métricas locais (métricas vistas do ponto de vista dos seus nós)
* Métricas **agregadas de projeto** podem ser disponibilizadas para todos os participantes.

---

### RF005 – Orquestração de Treinamento

**Prioridade:** Deve ter

**Dependências:** RF003, RF004

#### RF005.1 – Configuração Padrão de Treinamento

**Critérios de Aceitação**

* O sistema deve permitir criar **configurações de treinamento reutilizáveis** (templates), contendo, por exemplo:
  * modelo base ou referência ao modelo inicial
  * estratégia de treinamento federado/estratégia Flower
  * número mínimo de nós participantes
  * políticas de timeout e retries
* Essas configurações devem poder ser associadas a múltiplos projetos.
* Um projeto pode definir qual configuração padrão será utilizada quando um novo treinamento for iniciado.

#### RF005.2 – Configuração de Treinamento por Projeto e Início de Execução

**Critérios de Aceitação**

* Ao iniciar um treinamento, o sistema deve permitir:
  * selecionar uma configuração padrão de treinamento (RF005.1);
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
* Cada execução de treinamento deve receber um identificador único e ser associada ao projeto correspondente.

#### RF005.3 – Controle de Execução

**Critérios de Aceitação**

* Deve ser possível:
  * pausar o treinamento
  * retomar o treinamento pausado
  * cancelar o treinamento
* Em caso de pausa ou cancelamento:
  * o sistema deve registrar o estado atual da execução;
  * o status do treinamento deve ser atualizado adequadamente (ex.: pausado, cancelado).
* As ações de pausa, retomada e cancelamento devem ser registradas com timestamp e identificação do usuário responsável.

#### RF005.4 – Persistência de Artefatos de Treinamento

**Critérios de Aceitação**

* O sistema deve permitir armazenar de forma persistente, em um bucket S3 compatível:
  * modelos globais resultantes de cada rodada de agregação;
  * o modelo final da execução;
  * artefatos auxiliares relevantes (logs compactados, metadados, checkpoints opcionais).
* A gravação dos artefatos deve ocorrer no backend, podendo ser acionada por:
  * eventos provenientes do ServerApp (OTel logs ou métricas);
  * conclusão de rodada;
  * conclusão da execução.
* Cada artefato deve ser associado a:
  * identificação da execução;
  * projeto correspondente;
  * organização dona do projeto.
* O sistema deve permitir que usuários autorizados façam download dos artefatos.
* O sistema deve impedir que organizações que não participam do projeto acessem os arquivos armazenados.
* Deve ser mantido registro de:
  * qual usuário solicitou download;
  * timestamp;
  * tipo de artefato.
* A exclusão de artefatos deve acompanhar a política de exclusão do projeto (RF004.3).

---

### RF006 – Gerenciamento de Dados Locais

**Prioridade:** Deve ter

**Dependências:** RF003, RF005

#### RF006.1 – Registro de Metadados de Dataset por Nó

**Critérios de Aceitação**

* Cada nó deve manter, **internamente**, configurações associadas aos seus datasets para um determinado contexto de execução (por exemplo, para um determinado treinamento).
* O nó pode reportar ao servidor apenas metadados agregados, como:
  * quantidade de amostras
  * tipos gerais de dados (imagens, tabular, texto, etc.)
  * tamanho aproximado total
* Esses metadados são sempre relativos aos dados **mantidos dentro do nó**, sem envio de exemplos individuais.
* O sistema deve associar os metadados ao nó e, quando aplicável, ao treinamento específico (execução X).

#### RF006.2 – Validação de Disponibilidade de Dados para Treinamento

**Critérios de Aceitação**

* Antes do início de um treinamento (ou de uma rodada, quando necessário), o sistema deve solicitar aos nós participantes:
  * confirmação de disponibilidade de dados para aquele treinamento específico;
  * atualização de metadados relevantes (RF006.1).
* Se a disponibilidade mínima de dados não for atendida (por exemplo, número de nós com dataset adequado abaixo do mínimo solicitado), o sistema deve:
  * impedir o início do treinamento ou sinalizar o problema ao administrador (de acordo com configuração).
* Falhas de disponibilidade devem ser registradas e exibidas nas telas de monitoramento.

---

### RF007 – Monitoramento e Observabilidade

**Prioridade:** Deve ter

**Dependências:** RF003, RF005

#### RF007.1 – Monitoramento Global de Nós

**Critérios de Aceitação**

* O sistema deve exibir, em uma visão global de nós:
  * status (running/online/offline/inativo)
  * última atividade
  * uso atual de CPU, memória e GPU (visão resumida)
* A listagem de nós deve permitir ordenação por:
  * status
  * nome
  * última atividade
* Essa visão é independente de um treinamento específico (saúde geral do cluster / ambiente).

#### RF007.2 – Monitoramento de Treinamentos

**Critérios de Aceitação**

* Para um treinamento selecionado, o sistema deve exibir:
  * identificador da execução
  * projeto associado
  * rodada atual e total de rodadas previstas
  * tempo decorrido e, se possível, estimativa de conclusão
  * métricas agregadas por rodada (por exemplo, loss, accuracy)
* Para cada rodada, deve ser possível ver:
  * lista de nós participantes
  * nós esperados que falharam e o motivo, quando disponível (conectividade, timeout, etc.)
* A partir da visão do treinamento, o usuário deve poder navegar até a visão de detalhes por nó (RF007.3).

#### RF007.3 – Visualização por Nó e Compartilhamento entre Organizações

**Critérios de Aceitação**

* Para cada nó participante de um treinamento, o sistema deve exibir:
  * métricas locais relevantes (por exemplo, loss local, tempo de treino local, tamanho do dataset utilizado na rodada – somente em forma agregada);
  * gráficos de evolução dessas métricas ao longo das rodadas.
* Deve existir uma configuração, por nó ou por projeto, que permita definir se:
  * apenas a organização proprietária do nó pode ver os gráficos do nó; ou
  * outras organizações participantes do projeto podem visualizar os gráficos de treinamento daquele nó específico.
* Por padrão, a visualização de gráficos detalhados de um nó deve ser restrita à organização proprietária, a menos que explicitamente configurado para compartilhamento.

#### RF007.4 – Coleta de Telemetria via OTEL

**Critérios de Aceitação**

* A plataforma deve expor um endpoint OTLP para recebimento de:
  * métricas, logs e traces de ClientApp;
  * métricas, logs e traces de ServerApp;
  * métricas, logs e traces internas da plataforma.
* Cada dado recebido deve ser associado, quando aplicável, a:
  * nó de origem;
  * organização;
  * projeto ou execução de treinamento.
* Somente conexões autenticadas por mTLS com certificados válidos emitidos pela CA da plataforma devem ser aceitas.

#### RF007.5 – Exportação para Stack de Observabilidade

**Critérios de Aceitação**

* O OTel Collector da plataforma deve ser capaz de exportar:
  * métricas para o backend de métricas (ex.: Prometheus);
  * logs para o backend de logs (ex.: Loki);
  * traces para o backend de traces (ex.: Tempo).
* O backend da aplicação deve conseguir consultar essas fontes de dados para:
  * alimentar as telas de monitoramento definidas em RF007.1, RF007.2 e RF007.3;
  * gerar eventos que serão enviados aos clientes via WebSocket (RF009).
* Em caso de indisponibilidade temporária da stack de observabilidade, o sistema deve:
  * enfileirar ou agrupar a telemetria em memória ou armazenamento local até um limite configurável;
  * descartar dados excedentes de forma controlada, registrando estatísticas de perda quando ocorrer.

---

### RF008 – Autenticação e Autorização

**Prioridade:** Deve ter

**Dependências:** RF001, RF002, RF004

#### RF008.1 – Autenticação de Usuário

**Critérios de Aceitação**

* O sistema deve permitir autenticação de usuários por:
  * email e senha cadastrados (RF001.1); e/ou
  * provedores de identidade integrados à plataforma, quando configurados.
* O processo de login deve:
  * validar credenciais;
  * gerar token(s) de sessão (por exemplo, JWT) com tempo de expiração definido;
  * associar a sessão ao usuário autenticado e à organização ativa.
* O sistema deve permitir logout explícito, invalidando a sessão atual.
* O sistema deve oferecer fluxo de recuperação de senha baseado em:
  * envio de email com link de redefinição;
  * validade máxima configurável para o link;
  * obrigatoriedade de definir nova senha seguindo a política de complexidade vigente.

#### RF008.2 – Autorização por Papéis, Organização e Projeto

**Critérios de Aceitação**

* Toda ação sensível (criação, edição, exclusão de usuários, organizações, nós, projetos, treinamentos e artefatos) deve verificar:
  * se o usuário está autenticado;
  * se pertence à organização alvo da operação;
  * se possui papel adequado (dono, administrador, colaborador, observador, conforme contexto).
* A plataforma deve garantir que:
  * usuários só enxerguem projetos e nós vinculados às organizações das quais participam;
  * apenas donos/administradores possam:
    * gerenciar organização (RF002);
    * gerenciar nós da organização (RF003);
    * gerenciar projetos e treinamentos de que são responsáveis (RF004, RF005).
* As regras de autorização devem ser aplicadas também:
  * aos endpoints de download de artefatos (RF005.4);
  * ao acesso a métricas e gráficos de nós e treinamentos (RF007.3).

#### RF008.3 – Atualizações em tempo real com WebSocket

**Critérios de Aceitação**

* Toda conexão WebSocket deve:
  * ser estabelecida com usuário autenticado (RF008.1);
  * incluir informações que permitam ao backend determinar a organização e, quando aplicável, o projeto/treinamento associado;
  * ser encerrada pelo servidor quando a sessão do usuário expirar ou for revogada.

---

### RF009 – Comunicação em Tempo Real (WebSocket)

**Prioridade:** Deve ter

**Dependências:** RF003, RF005, RF007, RF008

#### RF009.1 – Canal de Atualizações de Treinamento

**Critérios de Aceitação**

* O sistema deve disponibilizar um endpoint WebSocket para envio de atualizações em tempo quase real relacionadas a:
  * estado de execuções de treinamento (iniciado, em andamento, pausado, cancelado, concluído);
  * progresso de rodadas (rodada atual, total previsto);
  * métricas agregadas por rodada (por exemplo, loss, accuracy).
* O cliente deve poder:
  * assinar atualizações de um projeto e/ou execução específica;
  * deixar de receber atualizações (unsubscribe) quando apropriado.
* As mensagens enviadas pelo WebSocket devem respeitar as regras de autorização (RF008.2), garantindo que:
  * usuários só recebam atualizações de projetos e treinamentos aos quais têm acesso;
  * organizações não recebam detalhes de nós pertencentes a outras organizações, exceto quando explicitamente compartilhados (RF007.3).

#### RF009.2 – Canal de Atualizações de Nós

**Critérios de Aceitação**

* O sistema deve utilizar o WebSocket para enviar aos clientes:
  * mudanças de status de nós (online/offline/running/inativo);
  * alertas relevantes (por exemplo, uso de recursos acima de limiar configurável).
* A origem dos dados (telemetria recebida via OTLP) deve ser processada pelo backend, que:
  * consolida as informações;
  * filtra por organização e projeto;
  * publica eventos no canal WebSocket adequado.
* Em caso de reconexão do cliente, o sistema deve permitir:
  * reenvio do estado atual dos nós e treinamentos relevantes; ou
  * recuperação do estado via chamadas REST, complementadas por atualizações futuras via WebSocket.

---

### RF010 – Integração com Plataforma de Dados (Supabase)

**Prioridade:** Deve ter

**Dependências:** RF001, RF002, RF004, RF008

#### RF010.1 – Persistência de Entidades Principais

**Critérios de Aceitação**

* O sistema deve utilizar uma plataforma de dados (por exemplo, Supabase) para persistir:
  * usuários, perfis e credenciais relacionadas;
  * organizações e seus relacionamentos com usuários;
  * projetos, execuções de treinamento e associações com organizações;
  * metadados de nós e de aplicações de treinamento.
* Operações de criação, edição e exclusão definidas nos requisitos RF001–RF006 devem refletir-se de forma consistente no armazenamento subjacente.

#### RF010.2 – Uso de Recursos de Autenticação Integrados

**Critérios de Aceitação**

* Quando disponível, a plataforma de dados deve ser utilizada para:
  * gestão de usuários e credenciais (registro, login, recuperação de senha);
  * emissão e validação de tokens de sessão, em alinhamento com RF008.1.
* A camada de backend deve:
  * validar tokens emitidos pela plataforma de dados;
  * propagar a identidade do usuário autenticado para as camadas de autorização, monitoramento e geração de logs.

---

Aqui está a versão **corrigida e expandida** do SRS com o **Vault integrado corretamente ao RF011**, mantendo coerência com a arquitetura e evitando redundâncias.

Incluí apenas o que você pediu:
✔ inserção do Vault
✔ correção de ambiguidades
✔ nada marcado como “atualizado”
✔ redação direta e limpa

Segue a seção modificada.

---

## RF011 – Infraestrutura de PKI e Emissão de Certificados

**Prioridade:** Deve ter

**Dependências:** RF003

#### RF011.1 – Estrutura da PKI

**Critérios de Aceitação**

* A plataforma deve utilizar uma infraestrutura de PKI baseada no **HashiCorp Vault**, operando como responsável pela emissão, armazenamento seguro e gerenciamento do ciclo de vida de certificados.
* O Vault deve manter:
  * uma **Root CA**, utilizada exclusivamente para assinar CAs intermediárias;
  * uma **CA intermediária por organização**, responsável pela emissão dos certificados dos nós.
* O backend deve solicitar ao Vault a emissão de certificados, selecionando automaticamente a CA intermediária correspondente à organização.

#### RF011.2 – Emissão e Renovação de Certificados

**Critérios de Aceitação**

* Certificados de nós devem ser emitidos apenas após:
  * validação do PSK e CSR no bootstrap (RF003.6), quando o nó é externo; ou
  * requisição interna para aplicações da própria plataforma (ex.: ServerApp).
* A renovação deve ocorrer por meio de:
  * envio de um novo CSR assinado com a chave privada atual; e
  * validação da assinatura pelo backend utilizando o Vault.
* O certificado deve estar válido no momento da renovação.
* Certificados emitidos devem incluir informações suficientes para:
  * identificar unicamente o nó;
  * associar o certificado à organização proprietária;
  * permitir extração de atributos para tagging de métricas.

#### RF011.3 – Revogação de Certificados

**Critérios de Aceitação**

* A revogação deve ser solicitada pelo backend ao Vault e registrada com timestamp e identificação do responsável.
* Após a revogação:
  * conexões mTLS utilizando o certificado revogado devem ser rejeitadas imediatamente;
  * o nó deve ser obrigado a executar novamente o processo de bootstrap para obter novos certificados.

#### RF011.4 – Armazenamento Seguro das Chaves das CAs

**Critérios de Aceitação**

* A **Root CA** e todas as **CAs intermediárias** devem ter:
  * suas chaves privadas armazenadas exclusivamente dentro do Vault;
  * proteção criptográfica e controles de acesso adequados;
  * política de acesso restrita apenas ao backend da plataforma.
* A rotação e criação de novas CAs intermediárias deve ocorrer sem afetar organizações existentes.
* Nenhuma chave privada deve ser exposta ao backend, aos nós ou a qualquer serviço fora do Vault.

#### RF011.5 – Ciclo de Vida e Expiração

**Critérios de Aceitação**

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

## **RNF001 – Performance**

**Critérios**

* O backend deve responder requisições REST em **< 200 ms** em condições normais de carga.
* O canal WebSocket deve entregar atualizações críticas (estado de treinamento, mudança de status de nó) em **≤ 2 segundos** após processamento do evento.
* O pipeline de telemetria deve suportar:
  * **≥ 5.000 eventos por segundo por organização**;
  * agregação e disponibilização de métricas em janelas **≤ 10 segundos**.
* Operações de emissão de certificados via Vault devem ocorrer em **≤ 1 segundo** após validação.
* O processo de bootstrap de nós deve ser concluído em **≤ 5 segundos** após o envio do CSR.
* O sistema deve suportar execuções de treinamento com:
  * **até 500 nós simultâneos por projeto**;
  * variabilidade de latência sem comprometer o algoritmo federado.
* Consultas de dashboards (nós, projetos, execuções) devem carregar em **≤ 3 segundos** com cache ativado.

---

## **RNF002 – Segurança**

**Critérios**

* Todo tráfego entre componentes internos deve utilizar **mTLS**, com certificados emitidos exclusivamente via Vault (RF011).
* A plataforma deve implementar políticas robustas de:
  * proteção contra brute-force (rate limits por IP/sessão);
  * detecção e bloqueio de PSKs inválidos ou reutilizados;
  * política de senhas alinhada a RF001.
* Tokens de autenticação devem seguir:
  * escopo limitado por organização e projeto;
  * expiração curta configurável;
  * revogação imediata via Supabase Auth.
* O backend, collectors e aplicações internas devem rodar isolados por namespaces (ou equivalentemente via Compose no desenvolvimento).
* Logs sensíveis devem:
  * ser mascarados no backend;
  * ser enviados via OTLP com criptografia;
  * seguir política de retenção configurável.
* A comunicação Backend → WebSocket deve ocorrer exclusivamente via **Redis Pub/Sub com autenticação e TLS**, quando Redis remoto.
* A API deve implementar:
  * verificação de input rigorosa;
  * prevenção de injeção (SQL, JSON, comando);
  * proteção contra CSRF e XSS no frontend.
* O acesso ao Vault deve seguir:
  * autenticação AppRole/Token apropriadamente restrita;
  * políticas por organização para CA intermediária;
  * ausência total de exposição de chaves privadas.

---

## **RNF003 – Escalabilidade**

**Critérios**

* A arquitetura deve suportar execução em **modo distribuído**, com múltiplas instâncias de backend, WebSocket e collectors.
* O Redis Pub/Sub deve permitir:

  * fan-out para milhares de conexões WebSocket simultâneas;
  * baixa latência na propagação de eventos.
* O armazenamento S3 deve suportar:
  * crescimento linear de artefatos;
  * uploads paralelos;
  * tamanhos individuais de arquivo ≥ 10 GB.
* A plataforma deve suportar evolução natural para Kubernetes, mantendo:
  * horizontal scaling automático para backend e WebSocket;
  * autoscaling para collectors OTel independentes.
* Treinamentos federados devem tolerar:
  * nós entrando/saindo sem reiniciar a execução;
  * variação de throughput entre nós.
* O nó local (collector + ServerApp) deve operar com footprint baixo, mesmo em dispositivos modestos (CPU limitada).

---

## **RNF004 – Disponibilidade**

**Critérios**

* A plataforma deve operar com disponibilidade mínima de **99,5%**.
* A perda temporária de conectividade com a stack de observabilidade deve:

  * não interromper execuções de treinamento;
  * gerar enfileiramento local temporário com descarte controlado (RF007.5).
* O Redis deve operar em modo de alta disponibilidade (cluster/hot standby).
* A queda de um backend não deve interromper:

  * execuções ativas de treinamento (ServerApp independente);
  * fluxo WebSocket (reconexão não destrutiva).
* O Supabase deve adotar replicação automática quando configurado no ambiente final.
* Mecanismos de retry com backoff devem existir para:

  * tentativas de bootstrap;
  * uploads S3;
  * push de telemetria.

---

## **RNF005 – Usabilidade**

**Critérios**

* Interfaces devem seguir padrões modernos de UX, com foco em:

  * clareza da visualização de treinamentos;
  * dashboards navegáveis;
  * separação significativa entre visão da organização e visão do projeto.
* O frontend deve oferecer:

  * feedback visual imediato para ações sensíveis (criação, exclusão, revogação);
  * loading states claros;
  * mensagens de erro compreensíveis e direcionadas.
* O WebSocket deve reconectar automaticamente quando a sessão não estiver expirada.
* A plataforma deve oferecer:

  * temas claros/escuros;
  * navegação consistente em mobile e desktop.

---

## **RNF006 – Compatibilidade**

**Critérios**

* Os nós devem ser compatíveis com:
  * Linux x86_64 e ARM64;
  * Docker Engine ≥ 24.x;
  * versões recentes de Python (para ClientApp).
* O Vault deve rodar em versões **≥ 1.16**, com PKI e AppRole habilitados.
* O supabase-js e supabase-py utilizados devem ser compatíveis com:
  * JWTs emitidos na mesma versão do Supabase Auth;
  * PostgREST ≥ 11.
* A plataforma deve exportar telemetria em formato:
  * OTLP (gRPC/HTTP), compatível com OTel Collector ≥ 0.103.
* A UI deve suportar:
  * navegadores modernos (Chrome, Firefox, Safari, Edge) — últimas duas versões;
  * WebSockets padrão (RFC 6455).

---

# 4. Glossário

# 5. Referências
