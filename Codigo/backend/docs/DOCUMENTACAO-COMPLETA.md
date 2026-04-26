# Documentação Completa — SGI (Sistema de Gerenciamento de Inadimplentes)

**Versão:** 1.0.0  
**Data:** Fevereiro de 2026  
**Autor:** Matheus  
**Instituição:** PUC Minas  
**Tipo:** TCC — Trabalho de Conclusão de Curso

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Stack Tecnológica](#2-stack-tecnológica)
3. [Arquitetura do Sistema](#3-arquitetura-do-sistema)
4. [Estrutura de Pastas](#4-estrutura-de-pastas)
5. [Modelo de Dados](#5-modelo-de-dados)
6. [Endpoints da API REST](#6-endpoints-da-api-rest)
7. [Segurança e Autenticação](#7-segurança-e-autenticação)
8. [Módulo de Reforma Tributária (IBS/CBS/IS)](#8-módulo-de-reforma-tributária-ibscbsis)
9. [Integração com IA (Gemini)](#9-integração-com-ia-gemini)
10. [Notificações e Agendamentos](#10-notificações-e-agendamentos)
11. [Relatórios e Exportação](#11-relatórios-e-exportação)
12. [Configuração e Variáveis de Ambiente](#12-configuração-e-variáveis-de-ambiente)
13. [Como Executar](#13-como-executar)
14. [Dados Iniciais (Seed)](#14-dados-iniciais-seed)
15. [Testes](#15-testes)
16. [Convenções e Boas Práticas](#16-convenções-e-boas-práticas)

---

## 1. Visão Geral

O **SGI** é um sistema backend desenvolvido em Java/Spring Boot para apoiar escritórios de contabilidade no gerenciamento de inadimplentes. O sistema permite:

- Cadastrar e gerenciar **clientes** e suas **dívidas**.
- Registrar **pagamentos** e emitir recibos.
- Enviar **notificações por e-mail** (cobranças e lembretes automáticos).
- Gerar **relatórios** de inadimplência, extrato por cliente e resumo financeiro, com exportação em PDF e Excel.
- Calcular tributos da **Reforma Tributária brasileira** (CBS/IBS/Imposto Seletivo) com base na Lei Complementar nº 214/2025.
- Consultar uma **IA especializada** (Google Gemini) para dúvidas sobre a reforma tributária.
- Gerenciar um **catálogo de serviços** prestados pelo escritório.
- Configurar o **servidor de e-mail** (SMTP) diretamente pelo sistema.

---

## 2. Stack Tecnológica

| Componente | Tecnologia | Versão |
|---|---|---|
| Linguagem | Java | 21 |
| Framework | Spring Boot | 3.2.2 |
| Banco de dados | SQLite (via JDBC) | 3.45.0.0 |
| ORM | Hibernate / Spring Data JPA | — |
| Segurança | Spring Security + JWT (JJWT) | 0.12.3 |
| Documentação da API | SpringDoc OpenAPI (Swagger UI) | 2.3.0 |
| Geração de PDF | OpenPDF | 1.3.30 |
| Geração de Excel | Apache POI (poi-ooxml) | 5.2.5 |
| E-mail | Spring Mail (SMTP) | — |
| IA | Google Gemini API (v1beta) | gemini-2.5-flash |
| Build | Maven | — |
| Utilitários | Lombok | — |

---

## 3. Arquitetura do Sistema

O sistema segue a **arquitetura em camadas** (Layered Architecture), padrão MVC adaptado para APIs REST:

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│              React + TypeScript (Sistema-MCA)               │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP/REST (JSON)
                             │ Authorization: Bearer <JWT>
┌────────────────────────────▼────────────────────────────────┐
│                    CONTROLLERS (REST)                        │
│   Recebem requisições, validam DTOs, delegam para services  │
├─────────────────────────────────────────────────────────────┤
│                      SERVICES                               │
│   Regras de negócio, orquestração, cálculos, transações     │
├─────────────────────────────────────────────────────────────┤
│                    REPOSITORIES                             │
│        Spring Data JPA — acesso ao banco SQLite             │
├─────────────────────────────────────────────────────────────┤
│                      ENTITIES                               │
│           Mapeamento objeto-relacional (JPA)                │
├─────────────────────────────────────────────────────────────┤
│                    BANCO DE DADOS                           │
│                  SQLite (./data/sgi.db)                     │
└─────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
  Google Gemini API              Servidor SMTP
  (consulta IA)                  (envio de e-mail)
```

**Camadas:**
- **Config:** Segurança (JWT), CORS, Runners de importação de dados.
- **Controller:** 12 controllers REST; finos, sem lógica de negócio.
- **Service:** 15 classes de serviço; toda a lógica de negócio fica aqui.
- **Repository:** 8 interfaces JPA com queries derivadas e paginação.
- **Entity:** 9 entidades JPA mapeadas para tabelas SQLite.
- **DTO:** Objetos de transferência separados em `request` (entrada) e `response` (saída); entidades nunca são expostas diretamente.
- **Exception:** Exceções customizadas + `GlobalExceptionHandler` (`@RestControllerAdvice`).
- **Util:** Utilitários de cálculo (multa/juros, vencimento, alíquotas).
- **Enum:** 7 enumerações de domínio.
- **Event:** Evento de atualização de status de cliente (Spring Events).

---

## 4. Estrutura de Pastas

```
Backend/
├── src/
│   ├── main/
│   │   ├── java/com/pucminas/sgi/
│   │   │   ├── SgiApplication.java          ← ponto de entrada
│   │   │   ├── config/                      ← segurança, CORS, JWT, runners
│   │   │   ├── controller/                  ← 12 controllers REST
│   │   │   ├── dto/
│   │   │   │   ├── request/                 ← 17 DTOs de entrada
│   │   │   │   └── response/                ← 24 DTOs de saída
│   │   │   ├── entity/                      ← 9 entidades JPA
│   │   │   ├── enums/                       ← 7 enumerações
│   │   │   ├── event/                       ← Spring Events
│   │   │   ├── exception/                   ← exceções customizadas + handler global
│   │   │   ├── repository/                  ← 8 repositórios JPA
│   │   │   ├── service/                     ← 15 serviços de negócio
│   │   │   └── util/                        ← utilitários de cálculo
│   │   └── resources/
│   │       ├── application.properties       ← configurações principais
│   │       ├── application-local.properties ← configurações locais (não commitado)
│   │       └── data/
│   │           ├── clientes-importar.txt    ← dados de clientes para importação
│   │           └── servicos-importar.txt    ← catálogo de serviços para importação
│   └── test/                                ← testes unitários
├── data/
│   └── sgi.db                               ← banco SQLite (gerado automaticamente)
├── docs/                                    ← documentações
├── scripts/                                 ← scripts utilitários
├── pom.xml
├── README.md
└── .gitignore
```

---

## 5. Modelo de Dados

### Diagrama de Relacionamentos

```
┌──────────┐        ┌──────────┐        ┌───────────┐
│ Cliente  │1──────N│  Divida  │1──────N│ Pagamento │
└──────────┘        └────┬─────┘        └───────────┘
                         │1
                         │N
                    ┌────▼──────────┐
                    │ DividaServico │N──────1┌─────────┐
                    └───────────────┘        │ Servico │
                                             └─────────┘

┌──────────────────────┐   ┌──────────────────┐
│ AgendamentoNotificacao│   │ NotificacaoEmail  │
└──────────────────────┘   └──────────────────┘

┌─────────────┐   ┌──────────┐
│ EmailConfig │   │ Usuario  │
└─────────────┘   └──────────┘
```

### Entidades Detalhadas

#### `Cliente`
| Campo | Tipo | Descrição |
|---|---|---|
| `clienteId` | UUID (PK) | Identificador único |
| `nome` | String | Nome completo |
| `cpfCnpj` | String (unique) | CPF ou CNPJ |
| `email` | String | E-mail de contato |
| `telefone` | String | Telefone |
| `endereco` | String | Endereço completo |
| `statusCliente` | Enum | `ATIVO` ou `INATIVO` |
| `saldoDevedor` | BigDecimal | Total em aberto (centavos) |
| `criadoEm` | LocalDateTime | Data de cadastro |
| `atualizadoEm` | LocalDateTime | Última atualização |

#### `Divida`
| Campo | Tipo | Descrição |
|---|---|---|
| `dividaId` | UUID (PK) | Identificador único |
| `cliente` | FK → Cliente | Cliente devedor |
| `valorOriginal` | BigDecimal | Valor original (centavos) |
| `valorDevedor` | BigDecimal | Valor atual com multa/juros (centavos) |
| `vencimento` | LocalDate | Data de vencimento |
| `descricao` | String | Descrição da dívida |
| `statusDivida` | Enum | `EM_ABERTO`, `PARCIAL`, `QUITADA`, `VENCIDA`, `CANCELADA` |
| `protocolo` | String (unique) | Número de protocolo gerado automaticamente |
| `criadoEm` | LocalDateTime | Data de registro |
| `atualizadoEm` | LocalDateTime | Última atualização |

#### `Pagamento`
| Campo | Tipo | Descrição |
|---|---|---|
| `pagamentoId` | UUID (PK) | Identificador único |
| `divida` | FK → Divida | Dívida relacionada |
| `valorPago` | BigDecimal | Valor pago (centavos) |
| `dataPagamento` | LocalDate | Data do pagamento |
| `metodoPagamento` | String | Forma de pagamento |
| `comprovante` | String | Referência do comprovante |
| `criadoEm` | LocalDateTime | Data do registro |

#### `Usuario`
| Campo | Tipo | Descrição |
|---|---|---|
| `usuarioId` | UUID (PK) | Identificador único |
| `telefone` | String (unique) | Login do usuário |
| `senha` | String | Senha (BCrypt) |
| `nome` | String | Nome do usuário |
| `perfil` | Enum | `RESPONSAVEL_FINANCEIRO` ou `PROPRIETARIA` |
| `statusUsuario` | Enum | `ATIVO` ou `INATIVO` |
| `ultimoAcesso` | LocalDateTime | Último login |
| `criadoEm` | LocalDateTime | Data de cadastro |

#### `Servico`
| Campo | Tipo | Descrição |
|---|---|---|
| `servicoId` | UUID (PK) | Identificador único |
| `nome` | String (max 200) | Nome do serviço |
| `descricao` | String (max 500) | Descrição |
| `valorPadrao` | BigDecimal | Valor sugerido (centavos, opcional) |
| `ativo` | Boolean | Se o serviço está disponível |

#### `DividaServico` (tabela de junção)
| Campo | Tipo | Descrição |
|---|---|---|
| `dividaServicoId` | UUID (PK) | Identificador único |
| `divida` | FK → Divida | Dívida relacionada |
| `servico` | FK → Servico | Serviço prestado |
| `valor` | BigDecimal | Valor cobrado por este serviço (centavos) |

#### `AgendamentoNotificacao`
| Campo | Tipo | Descrição |
|---|---|---|
| `agendamentoId` | UUID (PK) | Identificador único |
| `nome` | String | Nome do agendamento |
| `descricao` | String | Descrição |
| `periodicidade` | Enum | `DIARIO`, `SEMANAL`, `QUINZENAL`, `MENSAL` |
| `criterioAtraso` | Integer | Dias mínimos de atraso para disparar |
| `ativo` | Boolean | Se o agendamento está ativo |
| `ultimaExecucao` | LocalDateTime | Última vez que foi executado |
| `proximaExecucao` | LocalDateTime | Próxima execução calculada |
| `criadoEm` | LocalDateTime | Data de criação |

#### `NotificacaoEmail`
| Campo | Tipo | Descrição |
|---|---|---|
| `notificacaoId` | UUID (PK) | Identificador único |
| `clienteId` | UUID | Cliente destinatário |
| `dividaId` | UUID | Dívida relacionada |
| `tipo` | Enum | `COBRANCA` ou `LEMBRETE` |
| `emailDestino` | String | E-mail do destinatário |
| `assunto` | String | Assunto do e-mail |
| `corpoEmail` | TEXT | Corpo do e-mail (HTML) |
| `valorComunicado` | BigDecimal | Valor comunicado (centavos) |
| `statusEnvio` | Enum | `PENDENTE`, `ENVIADO`, `FALHOU` |
| `tentativas` | Integer | Número de tentativas de envio |
| `dataEnvio` | LocalDateTime | Data/hora do envio bem-sucedido |
| `proximaTentativa` | LocalDateTime | Próxima tentativa em caso de falha |
| `mensagemErro` | String | Mensagem de erro (se falhou) |
| `criadoEm` | LocalDateTime | Data de criação |

#### `EmailConfig`
| Campo | Tipo | Descrição |
|---|---|---|
| `configId` | UUID (PK) | Identificador único |
| `host` | String | Servidor SMTP (ex.: smtp.gmail.com) |
| `porta` | Integer | Porta SMTP (ex.: 587) |
| `usuario` | String | Usuário SMTP |
| `senha` | String | Senha SMTP |
| `usarTLS` | Boolean | Se usa STARTTLS |
| `emailRemetente` | String | E-mail do remetente |
| `nomeRemetente` | String | Nome exibido no e-mail |
| `ativo` | Boolean | Se esta configuração está ativa |
| `atualizadoEm` | LocalDateTime | Última atualização |

---

## 6. Endpoints da API REST

**Base URL:** `http://localhost:8080`  
**Autenticação:** todos os endpoints (exceto login e Swagger) exigem header:
```
Authorization: Bearer <token_jwt>
```

**Formato de valores monetários:** todos os valores são em **centavos** (inteiros).  
Exemplo: R$ 100,00 = `10000`

**Formato de datas:** `yyyy-MM-dd` (ex.: `2025-12-31`)

---

### Autenticação — `/api/auth`

| Método | Endpoint | Autenticação | Descrição |
|---|---|---|---|
| POST | `/api/auth/login` | Pública | Login com telefone + senha |
| POST | `/api/auth/logout` | JWT | Logout (cliente descarta o token) |
| GET | `/api/auth/me` | JWT | Dados do usuário autenticado |

**POST `/api/auth/login` — Request:**
```json
{
  "login": "11999999999",
  "senha": "minhasenha"
}
```
**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "tipo": "Bearer",
  "usuarioId": "uuid",
  "nome": "Nome do Usuário",
  "perfil": "RESPONSAVEL_FINANCEIRO"
}
```

---

### Clientes — `/api/clientes`

| Método | Endpoint | Descrição |
|---|---|---|
| POST | `/api/clientes` | Cadastrar cliente |
| GET | `/api/clientes` | Listar (filtros: `nome`, `status`, paginação) |
| GET | `/api/clientes/ranking-devedores` | Top N maiores devedores (`?limite=10`) |
| GET | `/api/clientes/{id}` | Consultar por ID |
| PUT | `/api/clientes/{id}` | Atualizar (completo) |
| PATCH | `/api/clientes/{id}` | Atualização parcial |
| DELETE | `/api/clientes/{id}` | Excluir (soft delete → INATIVO) |
| GET | `/api/clientes/{id}/dividas` | Listar dívidas do cliente |

**POST `/api/clientes` — Request:**
```json
{
  "nome": "João da Silva",
  "cpfCnpj": "123.456.789-00",
  "email": "joao@email.com",
  "telefone": "11999999999",
  "endereco": "Rua das Flores, 123"
}
```

---

### Dívidas — `/api/dividas`

| Método | Endpoint | Descrição |
|---|---|---|
| POST | `/api/dividas` | Registrar nova dívida |
| GET | `/api/dividas` | Listar (filtros: `clienteId`, `status`, `dataInicio`, `dataFim`, paginação) |
| GET | `/api/dividas/{id}` | Consultar por ID |
| PUT | `/api/dividas/{id}/status` | Forçar atualização de status |

**POST `/api/dividas` — Request:**
```json
{
  "clienteId": "uuid-do-cliente",
  "valorOriginal": 150000,
  "vencimento": "2025-12-31",
  "descricao": "Honorários de dezembro/2025",
  "itensServicos": [
    { "servicoId": "uuid-do-servico", "valor": 150000 }
  ]
}
```

---

### Pagamentos — `/api/pagamentos`

| Método | Endpoint | Descrição |
|---|---|---|
| POST | `/api/pagamentos` | Registrar pagamento |
| GET | `/api/pagamentos/divida/{dividaId}` | Listar pagamentos de uma dívida |
| GET | `/api/pagamentos/{id}` | Consultar por ID |

**POST `/api/pagamentos` — Request:**
```json
{
  "dividaId": "uuid-da-divida",
  "valorPago": 150000,
  "dataPagamento": "2025-12-15",
  "metodoPagamento": "PIX",
  "comprovante": "TX-12345"
}
```

---

### Inadimplência — `/api/inadimplentes`

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/inadimplentes` | Listar inadimplências |
| POST | `/api/inadimplentes` | Registrar nova inadimplência |
| PATCH | `/api/inadimplentes/{id}` | Confirmar pagamento |
| DELETE | `/api/inadimplentes/{id}` | Cancelar inadimplência |

---

### Serviços — `/api/servicos`

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/servicos` | Listar serviços ativos |
| GET | `/api/servicos/todos` | Listar todos (incluindo inativos) |
| GET | `/api/servicos/{id}` | Buscar por ID |
| POST | `/api/servicos` | Criar serviço |
| PUT | `/api/servicos/{id}` | Atualizar serviço |

---

### Relatórios — `/api/relatorios`

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/relatorios/resumo` | Resumo dashboard |
| GET | `/api/relatorios/ranking-devedores` | Ranking maiores devedores |
| GET | `/api/relatorios/inadimplentes` | Relatório de inadimplentes com filtros |
| GET | `/api/relatorios/inadimplencia-periodo` | Inadimplência por período |
| GET | `/api/relatorios/extrato-cliente/{id}` | Extrato completo do cliente |
| GET | `/api/relatorios/resumo-financeiro` | Resumo financeiro por período |
| GET | `/api/relatorios/exportar/{tipo}` | Exportar (`tipo` = `pdf` ou `excel`) |

---

### Notificações — `/api/notificacoes`

| Método | Endpoint | Descrição |
|---|---|---|
| POST | `/api/notificacoes/enviar-cobranca` | Enviar e-mail de cobrança |
| GET | `/api/notificacoes/cliente/{clienteId}` | Histórico de notificações |
| POST | `/api/notificacoes/reprocessar-falhas` | Reenviar notificações com falha |

---

### Agendamentos — `/api/agendamentos`

| Método | Endpoint | Descrição |
|---|---|---|
| POST | `/api/agendamentos` | Criar agendamento |
| GET | `/api/agendamentos` | Listar agendamentos |
| GET | `/api/agendamentos/{id}` | Consultar por ID |
| PUT | `/api/agendamentos/{id}` | Atualizar agendamento |
| PATCH | `/api/agendamentos/{id}/ativar` | Ativar/desativar (`?ativo=true`) |

---

### Configuração de E-mail — `/api/email-config`

| Método | Endpoint | Descrição |
|---|---|---|
| POST | `/api/email-config` | Criar ou atualizar configuração SMTP |
| GET | `/api/email-config` | Consultar configuração ativa |
| POST | `/api/email-config/testar` | Testar envio de e-mail |

---

### Tributos (Reforma Tributária) — `/api/tributos`

| Método | Endpoint | Descrição |
|---|---|---|
| POST | `/api/tributos/calcular` | Calcular CBS/IBS (por dentro, por fora, margem, separar) |
| GET | `/api/tributos/aliquotas/{categoria}` | Alíquotas por categoria (`PLENO`, `REDUZIDO`, `ZERO`) |
| POST | `/api/tributos/creditos/validar` | Calcular crédito tributário (não-cumulatividade) |
| GET | `/api/tributos/regime/{cnpj}` | Regime tributário simulado por CNPJ |
| POST | `/api/tributos/nota-fiscal/gerar` | Calcular totais CBS/IBS de uma nota fiscal |
| POST | `/api/tributos/consulta-ia` | Consultar IA sobre reforma tributária |
| GET | `/api/tributos/cashback` | Calcular cashback CBS para baixa renda |

---

### Usuários — `/api/usuarios`

| Método | Endpoint | Descrição |
|---|---|---|
| POST | `/api/usuarios` | Cadastrar novo usuário |
| GET | `/api/usuarios/pendentes` | Listar cadastros pendentes de aprovação |
| GET | `/api/usuarios/ativos` | Listar usuários com status **ATIVO** (somente **PROPRIETARIA**) |
| PATCH | `/api/usuarios/{id}/aprovar` | Aprovar cadastro pendente (somente **PROPRIETARIA**) |
| PATCH | `/api/usuarios/{id}/revogar` | Revogar acesso: define **INATIVO** (somente **PROPRIETARIA**; não revoga a si nem outra proprietária) |

**Revogação:** o alvo deve ser `RESPONSAVEL_FINANCEIRO` (ou outro perfil que não seja proprietária no futuro); usuário já `INATIVO` retorna sucesso idempotente sem alteração.

---

## 7. Segurança e Autenticação

### Fluxo JWT

```
1. Cliente envia POST /api/auth/login com { login, senha }
2. Backend valida credenciais (BCrypt)
3. Backend gera token JWT (HS256, expira em 24h por padrão)
4. Cliente armazena o token (localStorage/sessionStorage)
5. Todas as requisições seguintes incluem:
   Authorization: Bearer <token>
6. JwtAuthenticationFilter valida o token a cada requisição e **confere se o usuário ainda está ATIVO** no banco (tokens de usuário **INATIVO** ou **PENDENTE_APROVACAO** deixam de ser aceitos)
7. POST /api/auth/logout → cliente descarta o token
```

### Endpoints Públicos (sem autenticação)
- `POST /api/auth/login`
- `GET /api-docs/**` (Swagger JSON)
- `GET /swagger-ui/**` (Swagger UI)
- `GET /swagger-ui.html`

### Configurações de Segurança
- **Algoritmo de hash de senha:** BCrypt
- **Algoritmo JWT:** HS256
- **Expiração do token:** 86400000 ms (24 horas)
- **Sessão:** Stateless (sem sessão no servidor)
- **CSRF:** Desabilitado (API REST com JWT)
- **CORS:** Origens permitidas: `http://localhost:5173`, `http://localhost:3000`

---

## 8. Módulo de Reforma Tributária (IBS/CBS/IS)

Implementado com base na **Lei Complementar nº 214, de 16 de janeiro de 2025**.

### Alíquotas de Referência (LC 214/2025)

| Tributo | Alíquota Plena | Reduzida (60%) | Zero |
|---|---|---|---|
| CBS | 8,8% | 3,52% | 0% |
| IBS | 17,7% | 7,08% | 0% |
| **Total** | **26,5%** | **10,6%** | **0%** |

### Tipos de Cálculo Suportados

| Tipo | Descrição |
|---|---|
| `POR_DENTRO` | Tributo já incluso no preço (base = preço total) |
| `POR_FORA` | Tributo adicionado ao preço (base = preço sem tributo) |
| `SEPARAR_CBS_IBS` | Retorna CBS e IBS separados |
| `MARGEM_LUCRO` | Calcula tributo sobre margem de lucro |

### Funcionalidades
- Cálculo de crédito tributário (não-cumulatividade plena)
- Geração de totais de nota fiscal (CBS + IBS por item)
- Cashback CBS para famílias de baixa renda (CadÚnico)
- Consulta de regime tributário simulado por CNPJ

---

## 9. Integração com IA (Gemini)

### Configuração
- **Modelo:** `gemini-2.5-flash` (estável, Google AI)
- **API:** `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- **Chave:** variável de ambiente `GEMINI_API_KEY` ou propriedade `gemini.api.key`
- **Modelo configurável:** variável `GEMINI_MODEL` ou propriedade `gemini.model`

### Base de Conhecimento (System Context)
A IA é orientada com um contexto fixo baseado na **LC 214/2025**, cobrindo:
- Estrutura e princípios do IBS, CBS e IS
- Fato gerador e base de cálculo
- Não cumulatividade e créditos
- Regimes especiais (combustíveis, financeiro, imobiliário, turismo)
- Imposto Seletivo (tabaco, bebidas, veículos, refrigerantes)
- Administração (CGIBS, RFB, DFEN)
- Transição 2026–2033

### Endpoint
```
POST /api/tributos/consulta-ia
{
  "pergunta": "Como funciona o crédito de IBS?",
  "contexto": "Empresa de serviços, regime normal"
}
```

---

## 10. Notificações e Agendamentos

### Envio de E-mail
- Usa a configuração SMTP salva no banco (`EmailConfig`).
- Fallback para as propriedades do `application.properties` se não houver config no banco.
- Histórico de envios registrado em `NotificacaoEmail`.
- Reprocessamento automático de falhas.

### Agendamentos Automáticos (Scheduler)
- **Atualização de dívidas vencidas:** todo dia às 01:00 (`0 0 1 * * ?`)
- **Disparo de lembretes:** a cada 30 minutos (`0 */30 * * * ?`)
- Cada `AgendamentoNotificacao` define: periodicidade, critério de atraso (dias mínimos) e se está ativo.
- O `SchedulerService` verifica os agendamentos ativos e dispara e-mails para clientes inadimplentes que atendam ao critério.

---

## 11. Relatórios e Exportação

### Relatórios Disponíveis

| Relatório | Endpoint | Formato |
|---|---|---|
| Resumo dashboard | `GET /api/relatorios/resumo` | JSON |
| Ranking devedores | `GET /api/relatorios/ranking-devedores` | JSON |
| Inadimplentes | `GET /api/relatorios/inadimplentes` | JSON |
| Inadimplência por período | `GET /api/relatorios/inadimplencia-periodo` | JSON |
| Extrato do cliente | `GET /api/relatorios/extrato-cliente/{id}` | JSON |
| Resumo financeiro | `GET /api/relatorios/resumo-financeiro` | JSON |
| Exportar PDF | `GET /api/relatorios/exportar/pdf` | Arquivo PDF |
| Exportar Excel | `GET /api/relatorios/exportar/excel` | Arquivo .xlsx |

### Bibliotecas de Exportação
- **PDF:** OpenPDF (fork LGPL do iText)
- **Excel:** Apache POI (poi-ooxml)

---

## 12. Configuração e Variáveis de Ambiente

### Arquivo `application.properties`

```properties
spring.profiles.active=${SPRING_PROFILES_ACTIVE:local}
server.port=${SERVER_PORT:8080}

# Banco de dados
spring.datasource.url=jdbc:sqlite:./data/sgi.db
spring.jpa.hibernate.ddl-auto=update

# JWT
jwt.secret=${JWT_SECRET:...}
jwt.expiration=86400000

# E-mail SMTP
spring.mail.host=${SMTP_HOST:smtp.gmail.com}
spring.mail.port=${SMTP_PORT:587}
spring.mail.username=${SMTP_USER:}
spring.mail.password=${SMTP_PASS:}

# CORS
cors.allowed-origins=http://localhost:5173,http://localhost:3000

# Gemini IA
gemini.api.key=${GEMINI_API_KEY:}
gemini.model=${GEMINI_MODEL:gemini-2.5-flash}
```

### Variáveis de Ambiente

| Variável | Obrigatória | Padrão | Descrição |
|---|---|---|---|
| `GEMINI_API_KEY` | Sim (para IA) | — | Chave da API Google Gemini |
| `GEMINI_MODEL` | Não | `gemini-2.5-flash` | Modelo Gemini a usar |
| `JWT_SECRET` | Recomendado | valor padrão | Segredo para assinar tokens JWT |
| `SERVER_PORT` | Não | `8080` | Porta do servidor |
| `SMTP_HOST` | Não | `smtp.gmail.com` | Servidor SMTP |
| `SMTP_PORT` | Não | `587` | Porta SMTP |
| `SMTP_USER` | Não | — | Usuário SMTP |
| `SMTP_PASS` | Não | — | Senha SMTP |
| `SPRING_PROFILES_ACTIVE` | Não | `local` | Perfil ativo do Spring |

### Arquivo `application-local.properties` (não commitado)
Para configurações locais (chaves, senhas), crie este arquivo em `src/main/resources/`:
```properties
gemini.api.key=SUA_CHAVE_AQUI
```
Este arquivo está no `.gitignore` e nunca deve ser commitado.

---

## 13. Como Executar

### Pré-requisitos
- **JDK 21** instalado
- **Maven 3.8+** instalado
- (Opcional) Chave da API Gemini para funcionalidade de IA

### Passos

```powershell
# 1. Entrar na pasta do backend
cd C:\Users\Matheus\TCC\Backend

# 2. (Opcional) Configurar chave Gemini como variável de ambiente
$env:GEMINI_API_KEY = "sua_chave_aqui"

# 3. Compilar e subir o servidor
mvn spring-boot:run
```

O servidor sobe em: **`http://localhost:8080`**

### Swagger UI (documentação interativa)
Acesse: **`http://localhost:8080/swagger-ui.html`**

### Swagger JSON (OpenAPI)
Acesse: **`http://localhost:8080/api-docs`**

### Gerar JAR para produção
```powershell
mvn clean package -DskipTests
java -jar target/sgi-1.0.0.jar
```

---

## 14. Dados Iniciais (Seed)

O `DataSeeder` popula o banco automaticamente na primeira execução:

### Usuários
| Login (telefone) | Senha | Perfil |
|---|---|---|
| `11999990001` | `admin123` | `RESPONSAVEL_FINANCEIRO` |
| `11999990002` | `admin123` | `PROPRIETARIA` |

### Clientes de exemplo
- 3 clientes com CPF/CNPJ distintos, com status ATIVO.

### Dívidas de exemplo
- 5 dívidas com diferentes status (`EM_ABERTO`, `VENCIDA`, `QUITADA`).

### Pagamentos de exemplo
- 3 pagamentos vinculados às dívidas.

### Configuração de e-mail
- 1 configuração SMTP inativa (para preenchimento posterior).

---

## 15. Testes

### Estrutura de testes
```
src/test/java/com/pucminas/sgi/
├── dto/response/ResumoRelatorioDTOTest.java
├── enums/StatusDividaTest.java
├── event/ClienteStatusUpdateEventTest.java
├── exception/
│   ├── BusinessRuleExceptionTest.java
│   ├── DuplicateResourceExceptionTest.java
│   └── ResourceNotFoundExceptionTest.java
├── service/UsuarioServiceTest.java
└── util/
    ├── MultaJurosUtilTest.java
    └── VencimentoUtilTest.java
```

### Executar testes
```powershell
cd C:\Users\Matheus\TCC\Backend
mvn test
```

---

## 16. Convenções e Boas Práticas

### Valores Monetários
- Todos os valores são armazenados e trafegados em **centavos** (inteiros).
- Conversão para exibição: `valor / 100` no frontend.
- Exemplo: R$ 1.500,00 = `150000`

### IDs
- Todos os IDs são **UUID** (formato: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).
- Gerados automaticamente pelo banco/JPA.

### Datas
- Formato: `yyyy-MM-dd` (ex.: `2025-12-31`)
- Datas com hora: `yyyy-MM-dd'T'HH:mm:ss` (ISO 8601)

### Paginação
Endpoints de listagem suportam parâmetros de paginação Spring:
- `?page=0&size=20&sort=criadoEm,desc`

### Tratamento de Erros
Todos os erros retornam o formato padrão:
```json
{
  "timestamp": "2025-12-15T10:30:00",
  "status": 404,
  "error": "Not Found",
  "message": "Cliente não encontrado(a) com identificador: uuid",
  "path": "/api/clientes/uuid"
}
```

### Códigos HTTP
| Código | Situação |
|---|---|
| 200 | Sucesso (GET, PUT, PATCH, DELETE) |
| 201 | Criado com sucesso (POST) |
| 400 | Dados inválidos (validação) |
| 401 | Não autenticado (token ausente/inválido) |
| 404 | Recurso não encontrado |
| 409 | Conflito (duplicidade) |
| 422 | Regra de negócio violada |
| 500 | Erro interno do servidor |

---

*Documentação gerada em fevereiro de 2026 — SGI v1.0.0*
