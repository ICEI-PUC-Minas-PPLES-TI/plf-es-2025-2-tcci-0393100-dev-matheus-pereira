/**
 * Tipos do contrato da API – alinhados ao backend.
 * Ajuste aqui quando o backend definir o formato final.
 */

export type Cliente = {
  /** UUID (string) no backend; mock pode usar string numérica */
  id?: string;
  nome: string;
  email?: string;
  cpf?: string;
  telefone?: string;
  endereco?: string;
  situacao?: "Ativo" | "Inadimplente" | "Inativo";
  createdAt?: string;
  updatedAt?: string;
};

export type Inadimplencia = {
  /** UUID (string) no backend */
  id?: string;
  clienteId: string;
  clienteNome?: string;
  valor: number;
  /** Valor original da dívida (sem juros). Se omitido, considera-se igual a valor e juros = 0. */
  valorOriginal?: number;
  vencimento: string; // ISO 8601 (yyyy-MM-dd ou yyyy-MM-ddTHH:mm:ss)
  descricao?: string;
  status?: "EmAberto" | "Pago" | "Acordo";
  createdAt?: string;
  updatedAt?: string;
};

export type ResumoRelatorio = {
  totalClientes: number;
  totalDividas: number;
  totalEmAberto: number;
  totalPago: number;
};

export type TopDevedor = {
  clienteId?: number;
  clienteNome: string;
  total: number;
};

/** Ranking de maiores devedores */
export type RankingDevedorItem = {
  posicao: number;
  clienteId: string;
  clienteNome: string;
  cpfCnpj: string;
  valorDevido: number;
  qtdDividas: number;
  mediaDiasAtraso: number;
  status: "Crítico" | "Atenção" | "Recente";
};

/** Dívida ativa no extrato do cliente */
export type ExtratoDivida = {
  id: number | string;
  protocolo: string;
  descricao: string;
  vencimento: string;
  valorOriginal: number;
  valorDevido: number;
  status: string;
  diasAtraso: number;
};

export type ExtratoPagamento = {
  data: string;
  protocolo: string;
  valorPago: number;
  metodo: string;
  saldoApos: number;
};

export type ExtratoNotificacao = {
  data: string;
  tipo: string;
  status: string;
  tentativas: number;
};

export type ExtratoCliente = {
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

export type InadimplenciaPeriodoItem = {
  clienteId: string;
  clienteNome: string;
  cpfCnpj: string;
  qtdDividas: number;
  valorTotal: number;
  statusPior: "VENCIDA" | "PARCIAL" | "EM_ABERTO";
};

export type InadimplenciaPeriodoRelatorio = {
  dataInicio: string;
  dataFim: string;
  totalClientes: number;
  valorTotal: number;
  dividasVencidasNoPeriodo: number;
  valorVencidoNoPeriodo: number;
  detalhamento: InadimplenciaPeriodoItem[];
};

export type PagamentoRecebidoItem = {
  data: string;
  clienteNome: string;
  protocolo: string;
  valor: number;
  metodo: string;
  saldoRestante: number;
};

export type PagamentoPorMetodo = {
  metodo: string;
  valor: number;
  percentual: number;
};

export type PagamentosRecebidosRelatorio = {
  dataInicio: string;
  dataFim: string;
  totalPagamentos: number;
  valorTotal: number;
  porMetodo: PagamentoPorMetodo[];
  detalhamento: PagamentoRecebidoItem[];
};

export type AgingFaixa = {
  faixa: string;
  qtdDividas: number;
  valorTotal: number;
  percentual: number;
};

export type AgingRelatorio = {
  faixas: AgingFaixa[];
  valorTotalGeral: number;
};

export type EfetividadeCobrancaRelatorio = {
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

/** Resposta paginada comum (ajuste se o backend usar outro padrão) */
export type PageResponse<T> = {
  content: T[];
  totalElements?: number;
  totalPages?: number;
  size?: number;
  number?: number;
  first?: boolean;
  last?: boolean;
};

/** Usuário do sistema (login/cadastro) */
export type Usuario = {
  id?: number;
  nome: string;
  email: string;
  login?: string;
  createdAt?: string;
  updatedAt?: string;
};

/** Payload para cadastro de usuário */
export type CadastroUsuarioPayload = {
  nome: string;
  email: string;
  ativo?: boolean;
  telefone1?: string;
  telefone2?: string;
  funcao?: string;
  permissao?: string;
  planta?: string;
  senha?: string;
  login?: string;
};

/** Payload para POST /api/auth/login */
export type LoginPayload = {
  email?: string;
  login?: string;
  senha: string;
};

/** Resposta de POST /api/auth/login (backend pode usar token ou accessToken) */
export type LoginResponse = {
  token?: string;
  accessToken?: string;
};

/** Formato de erro da API (ajuste conforme o backend) */
export type ApiErrorBody = {
  message?: string;
  error?: string;
  status?: number;
  errors?: Array<{ field?: string; message?: string }>;
};
