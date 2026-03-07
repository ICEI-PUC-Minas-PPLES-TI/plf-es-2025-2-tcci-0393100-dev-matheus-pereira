/**
 * Normaliza respostas e payloads entre backend (API real) e tipos do frontend.
 * Usar quando VITE_USE_MOCK=false para compatibilidade com o backend.
 */

import type {
  Cliente,
  Inadimplencia,
  RankingDevedorItem,
  InadimplenciaPeriodoRelatorio,
} from "@/types/api";

/** Backend pode retornar clienteId em vez de id, statusCliente em vez de situacao, criadoEm/atualizadoEm */
export function normalizeClienteFromApi(raw: Record<string, unknown>): Cliente {
  const id = raw.id ?? raw.clienteId;
  const situacao = raw.situacao ?? mapStatusClienteToSituacao(String(raw.statusCliente ?? ""));
  return {
    id: id != null ? String(id) : undefined,
    nome: String(raw.nome ?? ""),
    email: raw.email != null ? String(raw.email) : undefined,
    cpf: raw.cpf != null ? String(raw.cpf) : raw.cpfCnpj != null ? String(raw.cpfCnpj) : undefined,
    telefone: raw.telefone != null ? String(raw.telefone) : undefined,
    endereco: raw.endereco != null ? String(raw.endereco) : undefined,
    situacao: situacao as Cliente["situacao"],
    createdAt: raw.createdAt != null ? String(raw.createdAt) : raw.criadoEm != null ? String(raw.criadoEm) : undefined,
    updatedAt: raw.updatedAt != null ? String(raw.updatedAt) : raw.atualizadoEm != null ? String(raw.atualizadoEm) : undefined,
  };
}

function mapStatusClienteToSituacao(status: string): string {
  const u = status.toUpperCase();
  if (u === "ATIVO") return "Ativo";
  if (u === "INADIMPLENTE") return "Inadimplente";
  if (u === "INATIVO") return "Inativo";
  return status || "Ativo";
}

/** Payload para backend: statusCliente em maiúsculas, cpfCnpj (backend aceita cpf como alias) */
export function normalizeClienteToApi(c: Partial<Cliente>): Record<string, unknown> {
  const situacao = c.situacao ?? "Ativo";
  const statusCliente = situacao === "Ativo" ? "ATIVO" : situacao === "Inadimplente" ? "INADIMPLENTE" : "INATIVO";
  const payload: Record<string, unknown> = {
    nome: c.nome,
    email: c.email,
    cpfCnpj: c.cpf?.replace(/\D/g, "") || undefined,
    telefone: c.telefone?.replace(/\D/g, "") || undefined,
    endereco: c.endereco,
    statusCliente,
  };
  if (c.id != null) payload.id = c.id;
  return payload;
}

/** Backend retorna valores monetários em reais (ex.: 1000 = R$ 1.000,00). Não multiplicar/dividir por 100. */
const VALOR_CENTAVOS = false;

export function normalizeInadimplenciaFromApi(raw: Record<string, unknown>): Inadimplencia {
  const valor = Number(raw.valor ?? 0);
  const valorOriginal = raw.valorOriginal != null ? Number(raw.valorOriginal) : undefined;
  return {
    id: raw.id != null ? String(raw.id) : undefined,
    clienteId: raw.clienteId != null ? String(raw.clienteId) : "",
    clienteNome: raw.clienteNome != null ? String(raw.clienteNome) : undefined,
    valor: VALOR_CENTAVOS ? valor / 100 : valor,
    valorOriginal: valorOriginal != null ? (VALOR_CENTAVOS ? valorOriginal / 100 : valorOriginal) : undefined,
    vencimento: String(raw.vencimento ?? ""),
    descricao: raw.descricao != null ? String(raw.descricao) : undefined,
    status: (raw.status as Inadimplencia["status"]) ?? "EmAberto",
    createdAt: raw.createdAt != null ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt != null ? String(raw.updatedAt) : undefined,
  };
}

/** Payload para POST inadimplentes: valor em reais */
export function normalizeInadimplenciaToApi(p: {
  clienteId: string;
  valor: number;
  vencimento: string;
  descricao?: string;
}): Record<string, unknown> {
  return {
    clienteId: p.clienteId,
    valor: VALOR_CENTAVOS ? Math.round(p.valor * 100) : p.valor,
    vencimento: p.vencimento,
    descricao: p.descricao,
  };
}

/** Backend retorna { limite, ranking: [] }; ranking[].nomeCliente, saldoDevedor. Campos opcionais: qtdDividas, mediaDiasAtraso, status */
export function normalizeRankingFromApi(data: unknown): RankingDevedorItem[] {
  if (!data || typeof data !== "object" || !("ranking" in data)) return [];
  const arr = (data as { ranking?: unknown[] }).ranking;
  if (!Array.isArray(arr)) return [];
  return arr.map((r: Record<string, unknown>, i: number) => ({
    posicao: Number(r.posicao ?? i + 1),
    clienteId: r.clienteId != null ? String(r.clienteId) : "",
    clienteNome: String(r.nomeCliente ?? r.clienteNome ?? ""),
    cpfCnpj: String(r.cpfCnpj ?? ""),
    valorDevido: Number(r.saldoDevedor ?? r.valorDevido ?? 0),
    qtdDividas: Number(r.quantidadeDividas ?? r.qtdDividas ?? 0),
    mediaDiasAtraso: Number(r.mediaDiasAtraso ?? 0),
    status: (r.status as RankingDevedorItem["status"]) ?? "Recente",
  }));
}

/** Backend retorna periodoInicio, periodoFim, totalClientesInadimplentes, valorTotalInadimplente, itens[] */
export function normalizeInadimplenciaPeriodoFromApi(data: unknown): InadimplenciaPeriodoRelatorio | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const itens = d.itens ?? d.detalhamento;
  const arr = Array.isArray(itens) ? itens : [];
  const detalhamento = arr.map((x: Record<string, unknown>) => ({
    clienteId: x.clienteId != null ? String(x.clienteId) : "",
    clienteNome: String(x.nomeCliente ?? x.clienteNome ?? ""),
    cpfCnpj: String(x.cpfCnpj ?? ""),
    qtdDividas: Number(x.quantidadeDividas ?? x.qtdDividas ?? 0),
    valorTotal: Number(x.saldoDevedor ?? x.valorTotal ?? 0),
    statusPior: (x.statusPior as InadimplenciaPeriodoRelatorio["detalhamento"][0]["statusPior"]) ?? "EM_ABERTO",
  }));
  return {
    dataInicio: String(d.periodoInicio ?? d.dataInicio ?? ""),
    dataFim: String(d.periodoFim ?? d.dataFim ?? ""),
    totalClientes: Number(d.totalClientesInadimplentes ?? d.totalClientes ?? 0),
    valorTotal: Number(d.valorTotalInadimplente ?? d.valorTotal ?? 0),
    dividasVencidasNoPeriodo: Number(d.dividasVencidasNoPeriodo ?? arr.length),
    valorVencidoNoPeriodo: Number(d.valorVencidoNoPeriodo ?? d.valorTotal ?? 0),
    detalhamento,
  };
}
