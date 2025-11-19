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

* Deve ser informado o campo nome (auto-gerado e editável).
* Se o nome não for informado, o sistema deve gerar um nome padrão (por exemplo, com base em um identificador único).
* O sistema deve gerar um **token de autenticação único**, exibido apenas no momento da criação.
* O token deve possuir formato adequado para uso em autenticação (por exemplo, string opaca) e possuir **expiração configurável**.
* O sistema deve registrar a data de criação e o administrador responsável pela criação do nó.

#### RF003.2 – Edição de Nó

**Critérios de Aceitação**

* É permitido editar o nome do nó, revogar o token de autenticação e alterar a expiração do token.
* A alteração do nome não deve alterar o identificador interno do nó.
* Não é obrigatório registrar log de auditoria para alterações.

#### RF003.3 – Exclusão de Nó

**Critérios de Aceitação**

* A exclusão do nó deve ser bloqueada se ele estiver vinculado a um treinamento ativo.
* Ao excluir um nó, o token de autenticação associado a ele deve ser invalidado imediatamente.
* A exclusão do nó pode ser definitiva (sem soft delete) neste MVP.

#### RF003.4 – Visualização de Nó

**Critérios de Aceitação**

* Para cada nó, devem ser exibidos, no mínimo:
  * nome
  * status: `running`, `online`, `offline`, `inativo`
  * última atividade
  * identificação dos recursos alocados (ex.: CPU, memória, GPU)
  * consumo atual de CPU, memória e GPU
* A listagem de nós deve permitir ordenação por:
  * status
  * nome
  * última atividade
* Detalhes de uso de recursos podem ser apresentados em dashboards específicos de monitoramento, sem sobrecarregar a tela principal de treinamento.

#### RF003.5 – Registro e Autenticação de Aplicações de Treinamento

**Critérios de Aceitação**

* O sistema deve permitir registrar aplicações de treinamento externas (por exemplo, `ServerApp`) como nós lógicos ou entidades equivalentes.
* Essas aplicações devem usar tokens de autenticação emitidos pela plataforma (conforme RF003.1) para:
  * enviar telemetria via OTLP;
  * reportar eventos de treinamento (início de rodada, conclusão, falha).
* A plataforma deve rejeitar conexões ou eventos provenientes de aplicações de treinamento que:
  * não apresentem token válido;
  * estejam associadas a nós revogados ou expirados.

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
  * impedir o início do treinamento **ou** sinalizar o problema ao administrador (de acordo com configuração).
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

* A plataforma deve expor um endpoint OTLP (HTTP ou gRPC) para recebimento de:
  * métricas, logs e traces dos `ClientApp` por meio de um OTel Collector de clientes;
  * métricas, logs e traces do `ServerApp`;
  * métricas, logs e traces dos componentes internos da plataforma (Backend, WebSocket, etc.), conforme necessário.
* Cada dado de telemetria recebido deve estar associado, quando aplicável, a:
  * nó de origem;
  * organização;
  * projeto e/ou execução de treinamento.
* A plataforma deve validar, para cada produtor de telemetria, o token de autenticação configurado para o nó ou serviço correspondente (conforme RF003.5).

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

#### RF008.3 – Autenticação de Conexões de Telemetria e WebSocket

**Critérios de Aceitação**

* Toda conexão que envie telemetria OTLP para a plataforma deve:
  * incluir token de autenticação do nó ou serviço emissor;
  * ser recusada se o token estiver inválido, expirado ou revogado.
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

# 3. Requisitos Não Funcionais

## RNF001 - Perfomance

## RNF002 - Segurança

## RNF003 - Escalabilidade

## RNF004 - Disponibilidade

## RNF005 - Usabilidade

## RNF006 - Compatibilidade

# 4. Glossário

# 5. Referências
