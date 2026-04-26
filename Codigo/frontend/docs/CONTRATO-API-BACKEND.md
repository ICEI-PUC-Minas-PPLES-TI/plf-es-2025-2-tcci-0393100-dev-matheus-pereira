# Relatório: O que o frontend precisa do backend

Este documento descreve **todos os endpoints, payloads e tipos** que o frontend consome. O backend deve implementar esta API para que a aplicação funcione corretamente.

---

## 1. Configuração geral

| Item | Esperado pelo frontend |
|------|------------------------|
| **Base URL** | Configurável via `VITE_API_URL` (quando vazio, usa "" e o mock pode ser ativado com `VITE_USE_MOCK=true`) |
| **Content-Type** | `application/json` |
| **Autenticação** | Token JWT em `Authorization: Bearer <token>`, chave no `localStorage`: `sgi_token`. Em 401, o frontend remove o token |
| **Timeout** | 20 segundos |
| **Resposta de lista** | O frontend aceita **array direto** `T[]` ou **paginação** `{ content: T[], totalElements?, totalPages?, size?, number?, first?, last? }` (função `normalizeListResponse` extrai o array) |

---

## 2. Endpoints por recurso

### 2.1 Clientes

| Método | URL | Query | Body | Resposta | Uso |
|--------|-----|-------|------|----------|-----|
| **GET** | `/api/clientes` | `page`, `size`, `nome` (opcional: filtro por nome) | — | `Cliente[]` ou `PageResponse<Cliente>` | Listagem (WebClientes, WebInadimplentes, WebRelatorios). Com `nome`, o backend pode filtrar clientes cujo nome contenha o termo. |
| **POST** | `/api/clientes` | — | `ClientePayload` | `Cliente` | Cadastro de cliente |
| **PATCH** | `/api/clientes/:id` | — | `Partial<Cliente>` | `Cliente` | Edição ou alteração de situação |
| **DELETE** | `/api/clientes/:id` | — | — | — | Exclusão de cliente |

**Payload de criação (POST):**
```ts
{
  nome: string;           // obrigatório
  email?: string;
  cpf?: string;          // enviado sem máscara (só dígitos)
  telefone?: string;     // enviado sem máscara
  endereco?: string;
  situacao?: "Ativo" | "Inadimplente" | "Inativo";  // default "Ativo"
}
```

**Payload de atualização (PATCH):** mesmo formato, com `id` opcional no body; a URL já traz o `id`.

---

### 2.2 Inadimplências

| Método | URL | Query | Body | Resposta | Uso |
|--------|-----|-------|------|----------|-----|
| **GET** | `/api/inadimplentes` | — | — | `Inadimplencia[]` ou `PageResponse<Inadimplencia>` | Listagem (Dashboard, WebInadimplentes) |
| **POST** | `/api/inadimplentes` | — | `InadimplenciaPayload` | `Inadimplencia` | Registrar inadimplência (pode ser múltiplas em loop) |
| **PATCH** | `/api/inadimplentes/:id` | — | `{ status: "Pago" }` | `Inadimplencia` | Confirmar pagamento |

**Resposta GET:** cada item deve incluir `clienteNome` (ou o backend pode deixar o frontend preencher; no mock é preenchido).

**Payload de criação (POST):**
```ts
{
  clienteId: string;    // UUID
  valor: number;        // em reais (ex.: 1000 = R$ 1.000,00)
  vencimento: string;   // ISO 8601: yyyy-MM-dd ou yyyy-MM-ddTHH:mm:ss
  descricao?: string;
}
```

**Valor:** o frontend envia e espera receber **valores monetários em reais** (ex.: 1000 = R$ 1.000,00). Não usar centavos.

**Banco (DELETE / cancelar inadimplência):** o front chama `DELETE /api/inadimplentes/:id` para “cancelar” a inadimplência daquele mês. O backend pode: **(1)** dar delete físico no registro da tabela de inadimplências, ou **(2)** manter o registro e apenas alterar um campo (ex.: `status = 'Cancelado'` ou `cancelado_em = now()`). Em ambos os casos, o `GET /api/inadimplentes` deve **não** retornar esse item na lista de “em aberto” (filtrar por status diferente de Cancelado ou por registros não excluídos). Nenhuma alteração de modelo é obrigatória se já existir um status ou flag de cancelamento; caso contrário, basta um status adicional (ex.: `Cancelado`) ou uma coluna `cancelado_em` (timestamp nullable).

---

### 2.3 Relatórios

| Método | URL | Query | Body | Resposta | Uso |
|--------|-----|-------|------|----------|-----|
| **GET** | `/api/relatorios/resumo` | `dias` (opcional): 30 \| 60 \| 90 | — | `ResumoRelatorio` | Dashboard (visão geral e gráfico “Montante a receber”) |
| **GET** | `/api/relatorios/ranking-devedores` | `periodo`, `limit`, `valorMin`, `qtdDividas`, `diasAtraso` | — | `RankingDevedorItem[]` | Relatórios – aba Ranking |
| **GET** | `/api/relatorios/extrato-cliente/:id` | — | — | `ExtratoCliente` | Relatórios – aba Extrato por Cliente |
| **GET** | `/api/relatorios/inadimplencia-periodo` | `dataInicio`, `dataFim` | — | `InadimplenciaPeriodoRelatorio` | Relatórios – Inadimplência por Período |
| **GET** | `/api/relatorios/pagamentos-recebidos` | `dataInicio`, `dataFim` | — | `PagamentosRecebidosRelatorio` | Relatórios – Pagamentos Recebidos |
| **GET** | `/api/relatorios/aging` | — | — | `AgingRelatorio` | Relatórios – Aging |
| **GET** | `/api/relatorios/efetividade-cobranca` | `mes` (ex.: "2025-01") | — | `EfetividadeCobrancaRelatorio` | Relatórios – Efetividade Cobrança |

**Query params – ranking-devedores:**
- `periodo`: string (ex.: "30", "90")
- `limit`: number (ex.: 10, 20)
- `valorMin`: opcional
- `qtdDividas`: opcional
- `diasAtraso`: opcional

**Relatórios opcionais:** Os endpoints `pagamentos-recebidos`, `aging` e `efetividade-cobranca` podem retornar 404 ou 501 enquanto não implementados; o frontend exibe a mensagem: "Este relatório ainda não está disponível no servidor."

---

### 2.4 Usuários (cadastro)

| Método | URL | Query | Body | Resposta | Uso |
|--------|-----|-------|------|----------|-----|
| **POST** | `/api/usuarios` | — | `CadastroUsuarioPayload` | (qualquer 2xx) | Tela de cadastro de usuário |

**Payload:**
```ts
{
  nome: string;
  email: string;
  ativo?: boolean;
  telefone1?: string;   // sem máscara
  telefone2?: string;
  funcao?: string;
  permissao?: string;
  planta?: string;
  senha?: string;
  login?: string;
}
```

---

## 3. Tipos TypeScript (contrato)

O backend deve devolver JSON compatível com estes tipos (definidos em `src/types/api.ts`).

### Cliente
```ts
type Cliente = {
  id?: string;            // UUID no backend
  nome: string;
  email?: string;
  cpf?: string;
  telefone?: string;
  endereco?: string;
  situacao?: "Ativo" | "Inadimplente" | "Inativo";  // backend pode usar statusCliente: "ATIVO" | "INADIMPLENTE" | "INATIVO"; o front normaliza
  createdAt?: string;     // backend pode retornar criadoEm
  updatedAt?: string;     // backend pode retornar atualizadoEm
};
```

### Inadimplencia
```ts
type Inadimplencia = {
  id?: string;            // UUID no backend
  clienteId: string;
  clienteNome?: string;   // preenchido pelo backend ou frontend
  valor: number;          // em reais (ex.: 1000 = R$ 1.000,00)
  vencimento: string;     // ISO 8601
  descricao?: string;
  status?: "EmAberto" | "Pago" | "Acordo";
  createdAt?: string;
  updatedAt?: string;
};
```

### ResumoRelatorio (Dashboard)
```ts
type ResumoRelatorio = {
  totalClientes: number;
  totalDividas: number;
  totalEmAberto: number;
  totalPago: number;
};
```
- **GET sem `dias`:** totais gerais.
- **GET com `dias`:** `totalEmAberto` e `totalDividas` consideram apenas inadimplências com vencimento no último N dias; o frontend espera que **totalPago** seja a soma de **todos** os itens com status "Pago" (não filtrado por período).
- **Unidade:** `totalEmAberto` e `totalPago` devem ser enviados em **reais** (ex.: 1000 = R$ 1.000,00). O frontend exibe diretamente sem conversão.

### RankingDevedorItem
O backend pode retornar um objeto com `ranking: RankingDevedorItem[]`; o frontend normaliza e aceita também `nomeCliente` → `clienteNome`, `saldoDevedor` → `valorDevido`.

```ts
type RankingDevedorItem = {
  posicao: number;
  clienteId: string;
  clienteNome: string;
  cpfCnpj: string;
  valorDevido: number;
  qtdDividas: number;
  mediaDiasAtraso: number;
  status: "Crítico" | "Atenção" | "Recente";
};
```

### ExtratoCliente
```ts
type ExtratoDivida = {
  id: number | string;
  protocolo: string;
  descricao: string;
  vencimento: string;
  valorOriginal: number;
  valorDevido: number;
  status: string;
  diasAtraso: number;
};

type ExtratoPagamento = {
  data: string;
  protocolo: string;
  valorPago: number;
  metodo: string;
  saldoApos: number;
};

type ExtratoNotificacao = {
  data: string;
  tipo: string;
  status: string;
  tentativas: number;
};

type ExtratoCliente = {
  cliente: {
    nome: string;
    cpfCnpj: string;
    telefone?: string;
    email?: string;
    status: string;
    saldoDevedorTotal: number;
  };
  dividasAtivas: ExtratoDivida[];
  historicoPagamentos: ExtratoPagamento[];
  notificacoes: ExtratoNotificacao[];
};
```

### InadimplenciaPeriodoRelatorio
```ts
type InadimplenciaPeriodoItem = {
  clienteId: string;
  clienteNome: string;
  cpfCnpj: string;
  qtdDividas: number;
  valorTotal: number;
  statusPior: "VENCIDA" | "PARCIAL" | "EM_ABERTO";
};

type InadimplenciaPeriodoRelatorio = {
  dataInicio: string;
  dataFim: string;
  totalClientes: number;
  valorTotal: number;
  dividasVencidasNoPeriodo: number;
  valorVencidoNoPeriodo: number;
  detalhamento: InadimplenciaPeriodoItem[];
};
```

### PagamentosRecebidosRelatorio
```ts
type PagamentoRecebidoItem = {
  data: string;
  clienteNome: string;
  protocolo: string;
  valor: number;
  metodo: string;
  saldoRestante: number;
};

type PagamentoPorMetodo = {
  metodo: string;
  valor: number;
  percentual: number;
};

type PagamentosRecebidosRelatorio = {
  dataInicio: string;
  dataFim: string;
  totalPagamentos: number;
  valorTotal: number;
  porMetodo: PagamentoPorMetodo[];
  detalhamento: PagamentoRecebidoItem[];
};
```

### AgingRelatorio
```ts
type AgingFaixa = {
  faixa: string;
  qtdDividas: number;
  valorTotal: number;
  percentual: number;
};

type AgingRelatorio = {
  faixas: AgingFaixa[];
  valorTotalGeral: number;
};
```

### EfetividadeCobrancaRelatorio
```ts
type EfetividadeCobrancaRelatorio = {
  periodo: string;
  totalNotificacoes: number;
  emailsEntregues: number;
  falhas: number;
  taxaEntrega: number;
  cobrancasComPagamento: number;
  taxaConversao: number;
  tempoMedioDias: number;
  comparativoAnterior?: { periodo: string; taxaConversao: number; variacaoPp: number };
};
```

### Paginação (opcional)
```ts
type PageResponse<T> = {
  content: T[];
  totalElements?: number;
  totalPages?: number;
  size?: number;
  number?: number;
  first?: boolean;
  last?: boolean;
};
```

### Erro
```ts
type ApiErrorBody = {
  message?: string;
  error?: string;
  status?: number;
  errors?: Array<{ field?: string; message?: string }>;
};
```
O frontend usa `message`, `error` ou `errors[0].message` para exibir mensagem amigável.

---

## 4. Resumo rápido por tela

| Tela | Endpoints usados |
|------|------------------|
| **Dashboard** | GET `/api/relatorios/resumo`, GET `/api/relatorios/resumo?dias=30|60|90`, GET `/api/inadimplentes` |
| **Clientes** | GET `/api/clientes`, POST `/api/clientes`, PATCH `/api/clientes/:id`, DELETE `/api/clientes/:id` |
| **Inadimplentes** | GET `/api/clientes`, GET `/api/inadimplentes`, POST `/api/inadimplentes`, PATCH `/api/inadimplentes/:id`, DELETE `/api/inadimplentes/:id` |
| **Relatórios** | GET `/api/clientes`, GET `/api/relatorios/ranking-devedores`, GET `/api/relatorios/extrato-cliente/:id`, GET `/api/relatorios/inadimplencia-periodo`, GET `/api/relatorios/pagamentos-recebidos`, GET `/api/relatorios/aging`, GET `/api/relatorios/efetividade-cobranca` |
| **Cadastro de usuário** | POST `/api/usuarios` |

---

## 5. Observações

1. **Datas:** o frontend envia e espera datas em ISO 8601 (`yyyy-MM-dd` ou com tempo). Filtros de período usam `dataInicio` e `dataFim` em query string.
2. **CPF/telefone:** o frontend envia sem máscara (só números) em POST/PATCH.
3. **Resumo “Recebido”:** o gráfico do dashboard espera que `totalPago` seja a soma de **todos** os itens com status "Pago", independente do parâmetro `dias`.
4. **Listas:** o frontend aceita resposta em array `T[]` ou objeto paginado com `content: T[]`; em ambos os casos a listagem funciona.

Documento gerado a partir do frontend. Atualize `src/types/api.ts` e este arquivo quando o contrato do backend mudar.
