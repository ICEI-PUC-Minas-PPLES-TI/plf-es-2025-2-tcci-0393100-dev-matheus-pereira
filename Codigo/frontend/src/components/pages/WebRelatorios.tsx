import { useEffect, useState } from "react";
import { api, getApiErrorMessage, getRelatorioErrorMessage, isMockEnabled, normalizeListResponse } from "@/lib/api";
import {
  normalizeClienteFromApi,
  normalizeInadimplenciaPeriodoFromApi,
  normalizeRankingFromApi,
  normalizeResumoFinanceiroFromApi,
} from "@/lib/apiNormalizers";
import type {
  Cliente,
  RankingDevedorItem,
  ExtratoCliente,
  InadimplenciaPeriodoRelatorio,
  ResumoFinanceiro,
  AgingRelatorio,
  EfetividadeCobrancaRelatorio,
} from "@/types/api";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";

const ABAS = [
  { id: "ranking", label: "Ranking Devedores" },
  { id: "extrato", label: "Extrato por Cliente" },
  { id: "inadimplencia", label: "Inadimplência por Período" },
  { id: "pagamentos", label: "Pagamentos Recebidos" },
  { id: "aging", label: "Aging" },
  { id: "efetividade", label: "Efetividade Cobrança" },
] as const;

type AbaId = (typeof ABAS)[number]["id"];

function formatarData(s: string) {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatarMoeda(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Gera CSV e faz download */
function exportarCSV(nome: string, cabecalhos: string[], linhas: string[][]) {
  const sep = ";";
  const BOM = "\uFEFF";
  const csv = BOM + [cabecalhos.join(sep), ...linhas.map((r) => r.join(sep))].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nome}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const REPORT_PRINT_CSS = `
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 24px; color: #1a1a1a; font-size: 14px; }
  .report { max-width: 900px; margin: 0 auto; }
  .report-header { border-bottom: 3px solid #A53F9C; padding-bottom: 12px; margin-bottom: 20px; }
  .report-title { font-size: 1.5rem; font-weight: 700; color: #1a1a1a; margin: 0 0 4px; }
  .report-subtitle { font-size: 0.8125rem; color: #6b7280; margin: 0; }
  .report-date { font-size: 0.8125rem; color: #6b7280; margin-top: 8px; }
  .report-criteria { font-size: 0.875rem; color: #374151; margin-bottom: 16px; padding: 8px 12px; background: #f9fafb; border-radius: 6px; }
  .report-section { margin-bottom: 24px; }
  .report-section-title { font-size: 1rem; font-weight: 600; margin: 0 0 12px; color: #374151; }
  table.report-table { width: 100%; border-collapse: collapse; margin: 0 0 16px; font-size: 13px; }
  table.report-table th, table.report-table td { border: 1px solid #e5e7eb; padding: 10px 12px; text-align: left; }
  table.report-table th { background: #f3f4f6; font-weight: 600; color: #374151; }
  table.report-table tr:nth-child(even) { background: #fafafa; }
  table.report-table .num { text-align: right; }
  table.report-table .center { text-align: center; }
  .report-footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 0.75rem; color: #9ca3af; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 500; }
  .badge--critico { background: #fef2f2; color: #b91c1c; }
  .badge--atencao { background: #fffbeb; color: #b45309; }
  .badge--recente { background: #f0fdf4; color: #15803d; }
  @media print { body { padding: 16px; } .report-footer { position: fixed; bottom: 0; left: 0; right: 0; } }
`;

function dataEmissao() {
  return new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type DadosImpressao = {
  aba: AbaId;
  ranking?: RankingDevedorItem[];
  filtroPeriodo?: string;
  filtroLimit?: number;
  inadPeriodo?: InadimplenciaPeriodoRelatorio | null;
  dataInicio?: string;
  dataFim?: string;
  pagamentos?: ResumoFinanceiro | null;
  dataInicioPag?: string;
  dataFimPag?: string;
  aging?: AgingRelatorio | null;
  efetividade?: EfetividadeCobrancaRelatorio | null;
  mesEfetividade?: string;
  extrato?: ExtratoCliente | null;
};

function gerarHtmlRelatorio(d: DadosImpressao): string {
  const tituloAba = ABAS.find((a) => a.id === d.aba)?.label ?? "Relatório";
  const header = `
    <div class="report-header">
      <h1 class="report-title">${tituloAba}</h1>
      <p class="report-subtitle">Gestão de Inadimplentes</p>
      <p class="report-date">Emitido em: ${dataEmissao()}</p>
    </div>`;

  if (d.aba === "ranking" && d.ranking?.length) {
    const criterios = [`Período: ${d.filtroPeriodo === "mes" ? "Último mês" : d.filtroPeriodo === "semana" ? "Última semana" : d.filtroPeriodo === "trimestre" ? "Trimestre" : "Ano"}`, `Limite: Top ${d.filtroLimit ?? 20}`].join(" | ");
    const linhas = d.ranking
      .map(
        (r) => `<tr>
        <td class="center">${r.posicao}</td>
        <td>${escapeHtml(r.clienteNome)}</td>
        <td>${escapeHtml(r.cpfCnpj)}</td>
        <td class="num">${formatarMoeda(r.valorDevido)}</td>
        <td class="center">${r.qtdDividas}</td>
        <td class="center">${r.mediaDiasAtraso} dias</td>
        <td><span class="badge badge--${r.status === "Crítico" ? "critico" : r.status === "Atenção" ? "atencao" : "recente"}">${r.status}</span></td>
      </tr>`
      )
      .join("");
    return `${header}
    <div class="report-criteria">${criterios}</div>
    <div class="report-section">
      <h2 class="report-section-title">Ranking de Maiores Devedores</h2>
      <table class="report-table">
        <thead><tr><th>Pos.</th><th>Cliente</th><th>CPF/CNPJ</th><th class="num">Valor Devido</th><th class="center">Qtd. Dívidas</th><th class="center">Dias Atraso (média)</th><th>Status</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>
    <div class="report-footer">Documento gerado pelo sistema. Confidencial.</div>`;
  }

  if (d.aba === "inadimplencia" && d.inadPeriodo) {
    const p = d.inadPeriodo;
    const criterios = `Período: ${formatarData(p.dataInicio)} a ${formatarData(p.dataFim)}`;
    const linhas = p.detalhamento
      .map(
        (r) => `<tr><td>${escapeHtml(r.clienteNome)}</td><td>${escapeHtml(r.cpfCnpj)}</td><td class="center">${r.qtdDividas}</td><td class="num">${formatarMoeda(r.valorTotal)}</td><td>${r.statusPior}</td></tr>`
      )
      .join("");
    return `${header}
    <div class="report-criteria">${criterios}</div>
    <div class="report-section">
      <p><strong>Total de clientes:</strong> ${p.totalClientes} &nbsp;|&nbsp; <strong>Valor total:</strong> ${formatarMoeda(p.valorTotal)} &nbsp;|&nbsp; <strong>Dívidas vencidas no período:</strong> ${p.dividasVencidasNoPeriodo} (${formatarMoeda(p.valorVencidoNoPeriodo)})</p>
      <table class="report-table">
        <thead><tr><th>Cliente</th><th>CPF/CNPJ</th><th class="center">Qtd. Dívidas</th><th class="num">Valor Total</th><th>Status Pior</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>
    <div class="report-footer">Documento gerado pelo sistema. Confidencial.</div>`;
  }

  if (d.aba === "pagamentos" && d.pagamentos) {
    const pag = d.pagamentos;
    const periodoInicio = pag.periodoInicio ?? d.dataInicioPag ?? "";
    const periodoFim = pag.periodoFim ?? d.dataFimPag ?? "";
    const criterios = `Período: ${formatarData(periodoInicio)} a ${formatarData(periodoFim)}`;
    return `${header}
    <div class="report-criteria">${criterios}</div>
    <div class="report-section">
      <p><strong>Valor total recebido:</strong> ${formatarMoeda(pag.totalRecebido)}</p>
    </div>
    <div class="report-footer">Documento gerado pelo sistema. Confidencial.</div>`;
  }

  if (d.aba === "aging" && d.aging) {
    const a = d.aging;
    const linhas = a.faixas
      .map(
        (f) => `<tr><td>${f.faixa}</td><td class="center">${f.qtdDividas}</td><td class="num">${formatarMoeda(f.valorTotal)}</td><td class="num">${f.percentual.toFixed(1)}%</td></tr>`
      )
      .join("");
    return `${header}
    <div class="report-section">
      <h2 class="report-section-title">Análise de Aging (Envelhecimento da Dívida)</h2>
      <table class="report-table">
        <thead><tr><th>Faixa</th><th class="center">Qtd. Dívidas</th><th class="num">Valor Total</th><th class="num">% do Total</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>
      <p><strong>Valor total geral:</strong> ${formatarMoeda(a.valorTotalGeral)}</p>
    </div>
    <div class="report-footer">Documento gerado pelo sistema. Confidencial.</div>`;
  }

  if (d.aba === "efetividade" && d.efetividade) {
    const e = d.efetividade;
    const comp = e.comparativoAnterior ? `<p>Comparativo: ${e.comparativoAnterior.periodo} ${e.comparativoAnterior.taxaConversao}% → este mês ${e.taxaConversao}% (${e.comparativoAnterior.variacaoPp >= 0 ? "+" : ""}${e.comparativoAnterior.variacaoPp} pp)</p>` : "";
    return `${header}
    <div class="report-criteria">Período: ${e.periodo}</div>
    <div class="report-section">
      <h2 class="report-section-title">Efetividade de Cobrança</h2>
      <p>Notificações enviadas: <strong>${e.totalNotificacoes}</strong> &nbsp;|&nbsp; Emails entregues: <strong>${e.emailsEntregues}</strong> (${e.taxaEntrega.toFixed(1)}%) &nbsp;|&nbsp; Falhas: <strong>${e.falhas}</strong></p>
      <p>Cobranças que resultaram em pagamento: <strong>${e.cobrancasComPagamento}</strong> (${e.taxaConversao}%) &nbsp;|&nbsp; Tempo médio: <strong>${e.tempoMedioDias}</strong> dias</p>
      ${comp}
    </div>
    <div class="report-footer">Documento gerado pelo sistema. Confidencial.</div>`;
  }

  if (d.aba === "extrato" && d.extrato) {
    const ex = d.extrato;
    const dados = `<p><strong>Nome:</strong> ${escapeHtml(ex.cliente.nome)} &nbsp;|&nbsp; <strong>CPF:</strong> ${escapeHtml(ex.cliente.cpfCnpj)} &nbsp;|&nbsp; <strong>Status:</strong> ${ex.cliente.status} &nbsp;|&nbsp; <strong>Saldo devedor total:</strong> ${formatarMoeda(ex.cliente.saldoDevedorTotal)}</p>`;
    const dividas = ex.dividasAtivas
      .map(
        (r) => `<tr><td>${r.protocolo}</td><td>${escapeHtml(r.descricao)}</td><td>${formatarData(r.vencimento)}</td><td class="num">${formatarMoeda(r.valorDevido)}</td><td>${r.status}</td><td class="center">${r.diasAtraso}</td></tr>`
      )
      .join("");
    const pagamentos = ex.historicoPagamentos
      .map(
        (p) => `<tr><td>${formatarData(p.data)}</td><td>${p.protocolo}</td><td class="num">${formatarMoeda(p.valorPago)}</td><td>${p.metodo}</td></tr>`
      )
      .join("");
    return `${header}
    <div class="report-section">
      <h2 class="report-section-title">Extrato por Cliente</h2>
      ${dados}
      <h3 class="report-section-title">Dívidas ativas</h3>
      <table class="report-table"><thead><tr><th>Protocolo</th><th>Descrição</th><th>Vencimento</th><th class="num">Valor Devido</th><th>Status</th><th class="center">Dias Atraso</th></tr></thead><tbody>${dividas}</tbody></table>
      <h3 class="report-section-title">Histórico de pagamentos</h3>
      <table class="report-table"><thead><tr><th>Data</th><th>Protocolo</th><th class="num">Valor Pago</th><th>Método</th></tr></thead><tbody>${pagamentos}</tbody></table>
    </div>
    <div class="report-footer">Documento gerado pelo sistema. Confidencial.</div>`;
  }

  return `${header}<div class="report-section"><p>Nenhum dado disponível para impressão. Aplique os filtros e aguarde o carregamento.</p></div><div class="report-footer">Documento gerado pelo sistema.</div>`;
}

function escapeHtml(s: string): string {
  const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(s).replace(/[&<>"']/g, (c) => map[c] ?? c);
}

/** Abre janela com relatório formatado e aciona impressão (PDF) */
function imprimirRelatorio(dados: DadosImpressao) {
  const titulo = `Relatório - ${ABAS.find((a) => a.id === dados.aba)?.label ?? "Relatório"}`;
  const html = gerarHtmlRelatorio(dados);
  const doc = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>${titulo}</title>
  <style>${REPORT_PRINT_CSS}</style>
</head>
<body>
  <div class="report">${html}</div>
  <script>
    window.onload = function() { window.print(); };
    window.onafterprint = function() { window.close(); };
  <\/script>
</body>
</html>`;
  const blob = new Blob([doc], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const janela = window.open(url, "_blank", "noopener,noreferrer");
  if (!janela) {
    URL.revokeObjectURL(url);
    window.print();
    return;
  }
  janela.focus();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export default function WebRelatorios() {
  const [aba, setAba] = useState<AbaId>("ranking");
  const [erro, setErro] = useState<string | null>(null);

  // Clientes (para busca do extrato)
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);

  // Ranking
  const [ranking, setRanking] = useState<RankingDevedorItem[]>([]);
  const [loadingRanking, setLoadingRanking] = useState(false);
  const [filtroPeriodo, setFiltroPeriodo] = useState("mes");
  const [filtroLimit, setFiltroLimit] = useState(20);
  const [filtroValorMin, setFiltroValorMin] = useState("");
  const [filtroQtdDividas, setFiltroQtdDividas] = useState("");
  const [filtroDiasAtraso, setFiltroDiasAtraso] = useState("");

  // Extrato
  const [clienteExtratoId, setClienteExtratoId] = useState<string>("");
  const [extrato, setExtrato] = useState<ExtratoCliente | null>(null);
  const [loadingExtrato, setLoadingExtrato] = useState(false);

  // Inadimplência período
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().slice(0, 10));
  const [inadPeriodo, setInadPeriodo] = useState<InadimplenciaPeriodoRelatorio | null>(null);
  const [loadingInadPeriodo, setLoadingInadPeriodo] = useState(false);

  // Pagamentos recebidos
  const [dataInicioPag, setDataInicioPag] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [dataFimPag, setDataFimPag] = useState(() => new Date().toISOString().slice(0, 10));
  const [pagamentos, setPagamentos] = useState<ResumoFinanceiro | null>(null);
  const [loadingPagamentos, setLoadingPagamentos] = useState(false);

  // Aging
  const [aging, setAging] = useState<AgingRelatorio | null>(null);
  const [loadingAging, setLoadingAging] = useState(false);

  // Efetividade
  const [mesEfetividade, setMesEfetividade] = useState(() => new Date().toISOString().slice(0, 7));
  const [efetividade, setEfetividade] = useState<EfetividadeCobrancaRelatorio | null>(null);
  const [loadingEfetividade, setLoadingEfetividade] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingClientes(true);
      try {
        const r = await api.get("/api/clientes", { params: { page: 0, size: 500 } });
        const list = normalizeListResponse(r.data);
        setClientes(list.map((c) => normalizeClienteFromApi(c as Record<string, unknown>)));
      } catch {
        setClientes([]);
      } finally {
        setLoadingClientes(false);
      }
    })();
  }, []);

  async function carregarRanking() {
    setErro(null);
    setLoadingRanking(true);
    try {
      const params = new URLSearchParams();
      params.set("periodo", filtroPeriodo);
      params.set("limit", String(filtroLimit));
      if (filtroValorMin) params.set("valorMin", filtroValorMin);
      if (filtroQtdDividas) params.set("qtdDividas", filtroQtdDividas);
      if (filtroDiasAtraso) params.set("diasAtraso", filtroDiasAtraso);
      const r = await api.get<RankingDevedorItem[] | { ranking?: unknown[] }>(`/api/relatorios/ranking-devedores?${params}`);
      setRanking(isMockEnabled() && Array.isArray(r.data) ? r.data : normalizeRankingFromApi(r.data));
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao carregar ranking"));
      setRanking([]);
    } finally {
      setLoadingRanking(false);
    }
  }

  useEffect(() => {
    if (aba === "ranking") carregarRanking();
  }, [aba, filtroPeriodo, filtroLimit, filtroValorMin, filtroQtdDividas, filtroDiasAtraso]);

  async function carregarExtrato() {
    if (!clienteExtratoId) {
      setExtrato(null);
      return;
    }
    setErro(null);
    setLoadingExtrato(true);
    try {
      const r = await api.get<ExtratoCliente>(`/api/relatorios/extrato-cliente/${clienteExtratoId}`);
      setExtrato(r.data);
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao carregar extrato"));
      setExtrato(null);
    } finally {
      setLoadingExtrato(false);
    }
  }

  useEffect(() => {
    if (aba === "extrato" && clienteExtratoId) carregarExtrato();
    else if (aba === "extrato" && !clienteExtratoId) setExtrato(null);
  }, [aba, clienteExtratoId]);

  async function carregarInadimplenciaPeriodo() {
    setErro(null);
    setLoadingInadPeriodo(true);
    try {
      const r = await api.get(
        `/api/relatorios/inadimplencia-periodo?dataInicio=${dataInicio}&dataFim=${dataFim}`
      );
      setInadPeriodo(isMockEnabled() ? (r.data as InadimplenciaPeriodoRelatorio) : (normalizeInadimplenciaPeriodoFromApi(r.data) ?? null));
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao carregar relatório"));
      setInadPeriodo(null);
    } finally {
      setLoadingInadPeriodo(false);
    }
  }

  useEffect(() => {
    if (aba === "inadimplencia") carregarInadimplenciaPeriodo();
  }, [aba, dataInicio, dataFim]);

  async function carregarPagamentos() {
    setErro(null);
    setLoadingPagamentos(true);
    try {
      const r = await api.get("/api/relatorios/resumo-financeiro", {
        params: {
          periodoInicio: dataInicioPag,
          periodoFim: dataFimPag,
        },
      });
      setPagamentos(normalizeResumoFinanceiroFromApi(r.data));
    } catch (e: unknown) {
      setErro(getRelatorioErrorMessage(e, "Falha ao carregar pagamentos recebidos"));
      setPagamentos(null);
    } finally {
      setLoadingPagamentos(false);
    }
  }

  useEffect(() => {
    if (aba === "pagamentos") carregarPagamentos();
  }, [aba, dataInicioPag, dataFimPag]);

  async function carregarAging() {
    setErro(null);
    setLoadingAging(true);
    try {
      const r = await api.get<AgingRelatorio>("/api/relatorios/aging");
      setAging(r.data);
    } catch (e: unknown) {
      setErro(getRelatorioErrorMessage(e, "Falha ao carregar aging"));
      setAging(null);
    } finally {
      setLoadingAging(false);
    }
  }

  useEffect(() => {
    if (aba === "aging") carregarAging();
  }, [aba]);

  async function carregarEfetividade() {
    setErro(null);
    setLoadingEfetividade(true);
    try {
      const r = await api.get<EfetividadeCobrancaRelatorio>(
        `/api/relatorios/efetividade-cobranca?mes=${mesEfetividade}`
      );
      setEfetividade(r.data);
    } catch (e: unknown) {
      setErro(getRelatorioErrorMessage(e, "Falha ao carregar efetividade"));
      setEfetividade(null);
    } finally {
      setLoadingEfetividade(false);
    }
  }

  useEffect(() => {
    if (aba === "efetividade") carregarEfetividade();
  }, [aba, mesEfetividade]);

  const exportarRankingExcel = () => {
    const cabecalhos = ["Posição", "Cliente", "CPF/CNPJ", "Valor Devido", "Qtd. Dívidas", "Dias Atraso (média)", "Status"];
    const linhas = ranking.map((r) => [
      String(r.posicao),
      r.clienteNome,
      r.cpfCnpj,
      String(r.valorDevido),
      String(r.qtdDividas),
      String(r.mediaDiasAtraso),
      r.status,
    ]);
    exportarCSV("ranking-devedores", cabecalhos, linhas);
  };

  const exportarInadimplenciaExcel = () => {
    if (!inadPeriodo) return;
    const cabecalhos = ["Cliente", "CPF/CNPJ", "Qtd. Dívidas", "Valor Total", "Status Pior"];
    const linhas = inadPeriodo.detalhamento.map((d) => [
      d.clienteNome,
      d.cpfCnpj,
      String(d.qtdDividas),
      String(d.valorTotal),
      d.statusPior,
    ]);
    exportarCSV("inadimplencia-periodo", cabecalhos, linhas);
  };

  const exportarPagamentosExcel = () => {
    if (!pagamentos) return;
    const cabecalhos = ["Período início", "Período fim", "Total recebido"];
    const linhas = [[
      pagamentos.periodoInicio ?? dataInicioPag,
      pagamentos.periodoFim ?? dataFimPag,
      String(pagamentos.totalRecebido),
    ]];
    exportarCSV("resumo-financeiro", cabecalhos, linhas);
  };

  const exportarAgingExcel = () => {
    if (!aging) return;
    const cabecalhos = ["Faixa", "Qtd. Dívidas", "Valor Total", "%"];
    const linhas = aging.faixas.map((f) => [
      f.faixa,
      String(f.qtdDividas),
      String(f.valorTotal),
      f.percentual.toFixed(1) + "%",
    ]);
    exportarCSV("aging", cabecalhos, linhas);
  };

  const statusChip = (status: RankingDevedorItem["status"]) => {
    const conf = status === "Crítico" ? { color: "error" as const, label: "Crítico" }
      : status === "Atenção" ? { color: "warning" as const, label: "Atenção" }
      : { color: "success" as const, label: "Recente" };
    return <Chip size="small" color={conf.color} label={conf.label} />;
  };

  return (
    <Box className="page-relatorios" sx={{ maxWidth: "100%", pb: 3 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
        Gestão de Inadimplentes
      </Typography>
      <Typography variant="h1" sx={{ fontSize: "1.5rem", fontWeight: 700, mb: 2 }}>
        Relatórios
      </Typography>

      <Tabs value={aba} onChange={(_, v) => setAba(v as AbaId)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        {ABAS.map((tab) => (
          <Tab key={tab.id} label={tab.label} value={tab.id} />
        ))}
      </Tabs>

      {erro && (
        <Alert severity="error" onClose={() => setErro(null)} sx={{ mb: 2 }}>
          {erro}
        </Alert>
      )}

      <Box>
        {aba === "ranking" && (
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} flexWrap="wrap" useFlexGap>
              <TextField select SelectProps={{ native: true }} label="Período" size="small" sx={{ minWidth: 160 }} value={filtroPeriodo} onChange={(e) => setFiltroPeriodo(e.target.value)}>
                <option value="semana">Última semana</option>
                <option value="mes">Último mês</option>
                <option value="trimestre">Trimestre</option>
                <option value="ano">Ano</option>
              </TextField>
              <TextField select SelectProps={{ native: true }} label="Limite" size="small" sx={{ minWidth: 120 }} value={filtroLimit} onChange={(e) => setFiltroLimit(Number(e.target.value))}>
                <option value={10}>Top 10</option>
                <option value={20}>Top 20</option>
              </TextField>
              <TextField type="number" label="Valor mínimo" size="small" placeholder="Opcional" sx={{ minWidth: 140 }} value={filtroValorMin} onChange={(e) => setFiltroValorMin(e.target.value)} />
              <TextField type="number" label="Qtd. dívidas mín." size="small" placeholder="Opcional" sx={{ minWidth: 140 }} value={filtroQtdDividas} onChange={(e) => setFiltroQtdDividas(e.target.value)} />
              <TextField type="number" label="Dias atraso mín." size="small" placeholder="Opcional" sx={{ minWidth: 140 }} value={filtroDiasAtraso} onChange={(e) => setFiltroDiasAtraso(e.target.value)} />
            </Stack>
            <Card elevation={1}>
              <CardHeader title="Ranking de Maiores Devedores" titleTypographyProps={{ variant: "h2", fontSize: "1.125rem" }} />
              <CardContent sx={{ pt: 0 }}>
                {loadingRanking ? (
                  <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Posição</strong></TableCell>
                          <TableCell><strong>Cliente</strong></TableCell>
                          <TableCell><strong>CPF/CNPJ</strong></TableCell>
                          <TableCell align="right"><strong>Valor Devido</strong></TableCell>
                          <TableCell align="center"><strong>Qtd. Dívidas</strong></TableCell>
                          <TableCell align="center"><strong>Dias Atraso (média)</strong></TableCell>
                          <TableCell><strong>Status</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {ranking.map((r) => (
                          <TableRow key={r.clienteId} hover>
                            <TableCell>{r.posicao}</TableCell>
                            <TableCell>{r.clienteNome}</TableCell>
                            <TableCell>{r.cpfCnpj}</TableCell>
                            <TableCell align="right">{formatarMoeda(r.valorDevido)}</TableCell>
                            <TableCell align="center">{r.qtdDividas}</TableCell>
                            <TableCell align="center">{r.mediaDiasAtraso} dias</TableCell>
                            <TableCell>{statusChip(r.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
            <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
              <Button variant="contained" startIcon={<DownloadIcon />} onClick={() => imprimirRelatorio({ aba: "ranking", ranking, filtroPeriodo, filtroLimit })}>
                Gerar PDF
              </Button>
              <Button variant="outlined" startIcon={<ExcelIcon />} onClick={exportarRankingExcel}>
                Exportar Excel
              </Button>
            </Stack>
          </Stack>
        )}

        {aba === "extrato" && (
          <Stack spacing={2}>
            <Autocomplete<Cliente, false, false, false>
              size="small"
              sx={{ maxWidth: 480, width: "100%" }}
              options={clientes}
              value={clientes.find((c) => c.id != null && String(c.id) === clienteExtratoId) ?? null}
              onChange={(_, c) => setClienteExtratoId(c?.id != null ? String(c.id) : "")}
              getOptionLabel={(c) => c.nome}
              isOptionEqualToValue={(a, b) => String(a.id ?? "") === String(b.id ?? "")}
              filterOptions={createFilterOptions<Cliente>({
                stringify: (c) => [c.nome, c.cpf, c.email, c.telefone].filter(Boolean).join(" "),
              })}
              loading={loadingClientes}
              disabled={loadingClientes}
              noOptionsText="Nenhum cliente encontrado"
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Cliente"
                  placeholder="Digite o nome, CPF, e-mail ou telefone"
                  InputLabelProps={{ ...params.InputLabelProps, shrink: true }}
                />
              )}
              ListboxProps={{ style: { maxHeight: 280 } }}
            />
            {loadingExtrato && <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>}
            {extrato && !loadingExtrato && (
              <>
                <Card elevation={1}><CardHeader title="A) Dados do Cliente" titleTypographyProps={{ variant: "h2", fontSize: "1.125rem" }} /><CardContent sx={{ pt: 0 }}><Stack spacing={0.5}><Typography><strong>Nome:</strong> {extrato.cliente.nome}</Typography><Typography><strong>CPF:</strong> {extrato.cliente.cpfCnpj}</Typography><Typography><strong>Telefone:</strong> {extrato.cliente.telefone ?? "—"}</Typography><Typography><strong>Email:</strong> {extrato.cliente.email ?? "—"}</Typography><Typography><strong>Status:</strong> {extrato.cliente.status}</Typography><Typography><strong>Saldo Devedor Total:</strong> {formatarMoeda(extrato.cliente.saldoDevedorTotal)}</Typography></Stack></CardContent></Card>
                <Card elevation={1}><CardHeader title="B) Dívidas Ativas" titleTypographyProps={{ variant: "h2", fontSize: "1.125rem" }} /><CardContent sx={{ pt: 0 }}><TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}><Table size="small" stickyHeader><TableHead><TableRow><TableCell><strong>Protocolo</strong></TableCell><TableCell><strong>Descrição</strong></TableCell><TableCell><strong>Vencimento</strong></TableCell><TableCell align="right"><strong>Valor Original</strong></TableCell><TableCell align="right"><strong>Valor Devido</strong></TableCell><TableCell><strong>Status</strong></TableCell><TableCell align="center"><strong>Dias Atraso</strong></TableCell></TableRow></TableHead><TableBody>{extrato.dividasAtivas.map((d) => (<TableRow key={d.id} hover><TableCell>{d.protocolo}</TableCell><TableCell>{d.descricao}</TableCell><TableCell>{formatarData(d.vencimento)}</TableCell><TableCell align="right">{formatarMoeda(d.valorOriginal)}</TableCell><TableCell align="right">{formatarMoeda(d.valorDevido)}</TableCell><TableCell>{d.status}</TableCell><TableCell align="center">{d.diasAtraso}</TableCell></TableRow>))}</TableBody></Table></TableContainer></CardContent></Card>
                <Card elevation={1}><CardHeader title="C) Histórico de Pagamentos" titleTypographyProps={{ variant: "h2", fontSize: "1.125rem" }} /><CardContent sx={{ pt: 0 }}><TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}><Table size="small" stickyHeader><TableHead><TableRow><TableCell><strong>Data</strong></TableCell><TableCell><strong>Protocolo</strong></TableCell><TableCell align="right"><strong>Valor Pago</strong></TableCell><TableCell><strong>Método</strong></TableCell><TableCell align="right"><strong>Saldo Após</strong></TableCell></TableRow></TableHead><TableBody>{extrato.historicoPagamentos.map((p, i) => (<TableRow key={i} hover><TableCell>{formatarData(p.data)}</TableCell><TableCell>{p.protocolo}</TableCell><TableCell align="right">{formatarMoeda(p.valorPago)}</TableCell><TableCell>{p.metodo}</TableCell><TableCell align="right">{formatarMoeda(p.saldoApos)}</TableCell></TableRow>))}</TableBody></Table></TableContainer></CardContent></Card>
                <Card elevation={1}><CardHeader title="D) Notificações Enviadas" titleTypographyProps={{ variant: "h2", fontSize: "1.125rem" }} /><CardContent sx={{ pt: 0 }}><TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}><Table size="small" stickyHeader><TableHead><TableRow><TableCell><strong>Data</strong></TableCell><TableCell><strong>Tipo</strong></TableCell><TableCell><strong>Status</strong></TableCell><TableCell align="center"><strong>Tentativas</strong></TableCell></TableRow></TableHead><TableBody>{extrato.notificacoes.map((n, i) => (<TableRow key={i} hover><TableCell>{formatarData(n.data)}</TableCell><TableCell>{n.tipo}</TableCell><TableCell>{n.status}</TableCell><TableCell align="center">{n.tentativas}</TableCell></TableRow>))}</TableBody></Table></TableContainer></CardContent></Card>
                <Stack direction="row" justifyContent="center"><Button variant="contained" startIcon={<DownloadIcon />} onClick={() => imprimirRelatorio({ aba: "extrato", extrato: extrato ?? undefined })}>Gerar PDF</Button></Stack>
              </>
            )}
          </Stack>
        )}

        {aba === "inadimplencia" && (
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField type="date" label="Data início" size="small" InputLabelProps={{ shrink: true }} value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
              <TextField type="date" label="Data fim" size="small" InputLabelProps={{ shrink: true }} value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </Stack>
            {loadingInadPeriodo && <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>}
            {inadPeriodo && !loadingInadPeriodo && (
              <>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} flexWrap="wrap" useFlexGap>
                  <Card variant="outlined" sx={{ flex: "1 1 200px", minWidth: 0 }}><CardContent><Typography variant="body2" color="text.secondary">Período</Typography><Typography fontWeight={600}>{formatarData(inadPeriodo.dataInicio)} a {formatarData(inadPeriodo.dataFim)}</Typography></CardContent></Card>
                  <Card variant="outlined" sx={{ flex: "1 1 200px", minWidth: 0 }}><CardContent><Typography variant="body2" color="text.secondary">Total de clientes com dívidas</Typography><Typography fontWeight={600}>{inadPeriodo.totalClientes}</Typography></CardContent></Card>
                  <Card variant="outlined" sx={{ flex: "1 1 200px", minWidth: 0 }}><CardContent><Typography variant="body2" color="text.secondary">Valor total</Typography><Typography fontWeight={600}>{formatarMoeda(inadPeriodo.valorTotal)}</Typography></CardContent></Card>
                  <Card variant="outlined" sx={{ flex: "1 1 200px", minWidth: 0 }}><CardContent><Typography variant="body2" color="text.secondary">Dívidas vencidas no período</Typography><Typography fontWeight={600}>{inadPeriodo.dividasVencidasNoPeriodo} ({formatarMoeda(inadPeriodo.valorVencidoNoPeriodo)})</Typography></CardContent></Card>
                </Stack>
                <Card elevation={1}><CardHeader title="Detalhamento" titleTypographyProps={{ variant: "h2", fontSize: "1.125rem" }} /><CardContent sx={{ pt: 0 }}><TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}><Table size="small" stickyHeader><TableHead><TableRow><TableCell><strong>Cliente</strong></TableCell><TableCell><strong>CPF/CNPJ</strong></TableCell><TableCell align="center"><strong>Qtd. Dívidas</strong></TableCell><TableCell align="right"><strong>Valor Total</strong></TableCell><TableCell><strong>Status Pior</strong></TableCell></TableRow></TableHead><TableBody>{inadPeriodo.detalhamento.map((d) => (<TableRow key={d.clienteId} hover><TableCell>{d.clienteNome}</TableCell><TableCell>{d.cpfCnpj}</TableCell><TableCell align="center">{d.qtdDividas}</TableCell><TableCell align="right">{formatarMoeda(d.valorTotal)}</TableCell><TableCell>{d.statusPior}</TableCell></TableRow>))}</TableBody></Table></TableContainer></CardContent></Card>
                <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap"><Button variant="contained" startIcon={<DownloadIcon />} onClick={() => imprimirRelatorio({ aba: "inadimplencia", inadPeriodo: inadPeriodo ?? undefined, dataInicio, dataFim })}>Gerar PDF</Button><Button variant="outlined" startIcon={<ExcelIcon />} onClick={exportarInadimplenciaExcel}>Exportar Excel</Button></Stack>
              </>
            )}
          </Stack>
        )}

        {aba === "pagamentos" && (
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField type="date" label="Data início" size="small" InputLabelProps={{ shrink: true }} value={dataInicioPag} onChange={(e) => setDataInicioPag(e.target.value)} />
              <TextField type="date" label="Data fim" size="small" InputLabelProps={{ shrink: true }} value={dataFimPag} onChange={(e) => setDataFimPag(e.target.value)} />
            </Stack>
            {loadingPagamentos && <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>}
            {pagamentos && !loadingPagamentos && (
              <>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} flexWrap="wrap" useFlexGap>
                  <Card variant="outlined" sx={{ flex: "1 1 200px", minWidth: 0 }}><CardContent><Typography variant="body2" color="text.secondary">Período</Typography><Typography fontWeight={600}>{formatarData(pagamentos.periodoInicio ?? dataInicioPag)} a {formatarData(pagamentos.periodoFim ?? dataFimPag)}</Typography></CardContent></Card>
                  <Card variant="outlined" sx={{ flex: "1 1 200px", minWidth: 0 }}><CardContent><Typography variant="body2" color="text.secondary">Valor total recebido</Typography><Typography fontWeight={600}>{formatarMoeda(pagamentos.totalRecebido)}</Typography></CardContent></Card>
                </Stack>
                <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap"><Button variant="contained" startIcon={<DownloadIcon />} onClick={() => imprimirRelatorio({ aba: "pagamentos", pagamentos: pagamentos ?? undefined, dataInicioPag, dataFimPag })}>Gerar PDF</Button><Button variant="outlined" startIcon={<ExcelIcon />} onClick={exportarPagamentosExcel}>Exportar Excel</Button></Stack>
              </>
            )}
          </Stack>
        )}

        {aba === "aging" && (
          <Stack spacing={2}>
            {loadingAging && <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>}
            {aging && !loadingAging && (
              <>
                <Card elevation={1}><CardHeader title="Análise de Aging (Envelhecimento da Dívida)" titleTypographyProps={{ variant: "h2", fontSize: "1.125rem" }} /><CardContent sx={{ pt: 0 }}><TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}><Table size="small" stickyHeader><TableHead><TableRow><TableCell><strong>Faixa</strong></TableCell><TableCell align="center"><strong>Qtd. Dívidas</strong></TableCell><TableCell align="right"><strong>Valor Total</strong></TableCell><TableCell align="right"><strong>% do Total</strong></TableCell></TableRow></TableHead><TableBody>{aging.faixas.map((f) => (<TableRow key={f.faixa} hover><TableCell>{f.faixa}</TableCell><TableCell align="center">{f.qtdDividas}</TableCell><TableCell align="right">{formatarMoeda(f.valorTotal)}</TableCell><TableCell align="right">{f.percentual.toFixed(1)}%</TableCell></TableRow>))}</TableBody></Table></TableContainer><Typography sx={{ mt: 2, fontWeight: 600 }}>Valor total geral: {formatarMoeda(aging.valorTotalGeral)}</Typography></CardContent></Card>
                <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap"><Button variant="contained" startIcon={<DownloadIcon />} onClick={() => imprimirRelatorio({ aba: "aging", aging: aging ?? undefined })}>Gerar PDF</Button><Button variant="outlined" startIcon={<ExcelIcon />} onClick={exportarAgingExcel}>Exportar Excel</Button></Stack>
              </>
            )}
          </Stack>
        )}

        {aba === "efetividade" && (
          <Stack spacing={2}>
            <TextField type="month" label="Mês" size="small" InputLabelProps={{ shrink: true }} value={mesEfetividade} onChange={(e) => setMesEfetividade(e.target.value)} sx={{ maxWidth: 220 }} />
            {loadingEfetividade && <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>}
            {efetividade && !loadingEfetividade && (
              <>
                <Card elevation={1}><CardHeader title={`Efetividade de Cobrança — ${efetividade.periodo}`} titleTypographyProps={{ variant: "h2", fontSize: "1.125rem" }} /><CardContent sx={{ pt: 0 }}><Stack spacing={1.5}><Typography>📧 Notificações enviadas: <strong>{efetividade.totalNotificacoes}</strong></Typography><Typography>✅ Emails entregues: <strong>{efetividade.emailsEntregues}</strong> ({efetividade.taxaEntrega.toFixed(1)}%)</Typography><Typography>❌ Falhas: <strong>{efetividade.falhas}</strong></Typography><Typography>💰 Cobranças que resultaram em pagamento: <strong>{efetividade.cobrancasComPagamento}</strong> ({efetividade.taxaConversao}%)</Typography><Typography>⏱ Tempo médio entre cobrança e pagamento: <strong>{efetividade.tempoMedioDias}</strong> dias</Typography>{efetividade.comparativoAnterior && (<Typography>📊 Comparativo: {efetividade.comparativoAnterior.periodo} {efetividade.comparativoAnterior.taxaConversao}% → este mês {efetividade.taxaConversao}% ({efetividade.comparativoAnterior.variacaoPp >= 0 ? "+" : ""}{efetividade.comparativoAnterior.variacaoPp}pp) ✅</Typography>)}</Stack></CardContent></Card>
                <Stack direction="row" justifyContent="center"><Button variant="contained" startIcon={<DownloadIcon />} onClick={() => imprimirRelatorio({ aba: "efetividade", efetividade: efetividade ?? undefined, mesEfetividade })}>Gerar PDF</Button></Stack>
              </>
            )}
          </Stack>
        )}
      </Box>
    </Box>
  );
}

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function ExcelIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M8 13h2m4 0h2m-8 4h2m4 0h2m-8 4h2m4 0h2" />
    </svg>
  );
}
