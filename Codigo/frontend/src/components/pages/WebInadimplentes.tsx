import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api, getApiErrorMessage, isMockEnabled, normalizeListResponse } from "@/lib/api";
import { parseValorReais } from "@/lib/valorBrasil";
import {
  normalizeClienteFromApi,
  normalizeInadimplenciaFromApi,
  normalizeInadimplenciaToApi,
  normalizePagamentoInadimplenciaFromApi,
} from "@/lib/apiNormalizers";
import { invalidateDashboard } from "@/lib/dashboardRefresh";
import { buildGmailComposeUrl, copyCobrancaEmailToClipboard, openGmailCompose } from "@/lib/mailtoCobranca";
import type { Cliente, Inadimplencia, PagamentoInadimplencia } from "@/types/api";

type ServicoResumo = {
  servicoId: string;
  nome: string;
  descricao?: string | null;
  valorPadrao?: number | null;
  ativo?: boolean | null;
};

function ordenarPagamentosPorData(pagamentos: PagamentoInadimplencia[]): PagamentoInadimplencia[] {
  return [...pagamentos].sort((a, b) => {
    const da = (a.dataPagamento || "").split("T")[0];
    const db = (b.dataPagamento || "").split("T")[0];
    const c = da.localeCompare(db);
    if (c !== 0) return c;
    return (a.criadoEm ?? "").localeCompare(b.criadoEm ?? "");
  });
}

function formatarData(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

/** Formata ISO como mês/ano (ex.: 2019-02-28 → 02/2019) */
function formatarMesAno(iso: string): string {
  if (!iso) return "—";
  const [y, m] = iso.split("T")[0].split("-");
  return `${m}/${y}`;
}

function diasEmAtraso(vencimento: string): number {
  const v = new Date(vencimento.split("T")[0]);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  v.setHours(0, 0, 0, 0);
  const diff = Math.floor((hoje.getTime() - v.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

/** Formata CPF (11 dígitos) ou CNPJ (14 dígitos) com máscara padrão */
function formatCpfCnpj(cpf: string | undefined): string {
  if (!cpf) return "";
  const n = cpf.replace(/\D/g, "");
  if (n.length === 11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (n.length === 14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return cpf;
}


export default function WebInadimplentes() {
  const [itens, setItens] = useState<Inadimplencia[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [toastEmailFormatado, setToastEmailFormatado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ordenarPor, setOrdenarPor] = useState<"cliente" | "valor" | "dias" | null>(null);
  const [ordemAsc, setOrdemAsc] = useState(true);
  const [pagina, setPagina] = useState(1);
  const itensPorPagina = 10;
  const [modalRegistroAberto, setModalRegistroAberto] = useState(false);
  const [detalheClienteId, setDetalheClienteId] = useState<string | null>(null);
  const [inadimplenciaParaCancelar, setInadimplenciaParaCancelar] = useState<{ item: Inadimplencia; nomeCliente: string } | null>(null);
  const [clientes, setClientes] = useState<Pick<Cliente, "id" | "nome" | "cpf" | "email">[]>([]);
  const [clienteBusca, setClienteBusca] = useState("");
  const [clienteDropdownAberto, setClienteDropdownAberto] = useState(false);
  const [servicos, setServicos] = useState<ServicoResumo[]>([]);
  const [loadingServicos, setLoadingServicos] = useState(false);
  /** Índice da linha de honorário cujo valor está sendo preenchido pelo modal de serviços; null = modal fechado */
  const [modalServicosValorRowIndex, setModalServicosValorRowIndex] = useState<number | null>(null);
  /** IDs dos serviços selecionados no modal "Adicionar por serviços" (para somar ao valor) */
  const [servicosSelecionadosParaValor, setServicosSelecionadosParaValor] = useState<string[]>([]);
  const [servicosBuscaValor, setServicosBuscaValor] = useState("");
  const [modalPagamentoParcial, setModalPagamentoParcial] = useState<{
    inadimplencia: Inadimplencia;
    nomeCliente: string;
    valorDigitado: string;
    dataPagamento: string;
    metodoPagamento: string;
  } | null>(null);
  const [modalConfirmacaoPagamento, setModalConfirmacaoPagamento] = useState<{
    inadimplencia: Inadimplencia;
    nomeCliente: string;
    descontoDigitado: string;
    metodoPagamento: string;
    observacao: string;
    dataPagamento: string;
  } | null>(null);
  const [loadingConfirmacaoPagamento, setLoadingConfirmacaoPagamento] = useState(false);
  const [linhaDetalheAbertaId, setLinhaDetalheAbertaId] = useState<string | null>(null);
  /** Fallback quando o item da listagem ainda não traz `pagamentos` embutidos */
  const [historicoPagamentosParciais, setHistoricoPagamentosParciais] = useState<Record<string, PagamentoInadimplencia[]>>({});
  const [loadingHistoricoPagamentosParciais, setLoadingHistoricoPagamentosParciais] = useState<Record<string, boolean>>({});
  const [modalAjustarJurosAberto, setModalAjustarJurosAberto] = useState(false);
  const [jurosGlobal, setJurosGlobal] = useState<{ multa: string; juros: string }>({ multa: "0,33", juros: "2" });
  const [loadingJurosGlobal, setLoadingJurosGlobal] = useState(false);
  const clienteInputRef = useRef<HTMLInputElement>(null);
  const nextRowIdRef = useRef(1);
  type MensalidadeRow = { rowId: number; mes: string; ano: string; valorDigitado: string };
  const [formRegistro, setFormRegistro] = useState<{
    clienteId: string;
    descricao: string;
    mensalidades: MensalidadeRow[];
  }>({
    clienteId: "",
    descricao: "",
    mensalidades: [{ rowId: 1, mes: String(new Date().getMonth() + 1).padStart(2, "0"), ano: String(new Date().getFullYear()), valorDigitado: "" }],
  });

  async function listar() {
    try {
      setLoading(true);
      setErro(null);
      const r = await api.get("/api/inadimplentes", { params: { paginado: false } });
      const rawList = normalizeListResponse<Record<string, unknown>>(r.data);
      setItens(isMockEnabled() ? (rawList as Inadimplencia[]) : rawList.map((item) => normalizeInadimplenciaFromApi(item)));
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao listar inadimplências"));
    } finally {
      setLoading(false);
    }
  }

  async function carregarClientes() {
    try {
      const r = await api.get("/api/clientes", { params: { page: 0, size: 500 } });
      const list = normalizeListResponse<Record<string, unknown>>(r.data);
      setClientes(list.map((c) => {
        const norm = normalizeClienteFromApi(c);
        return { id: norm.id ?? "", nome: norm.nome, cpf: norm.cpf, email: norm.email };
      }));
    } catch {
      setClientes([]);
    }
  }

  async function carregarServicos() {
    if (isMockEnabled()) {
      setServicos([]);
      return;
    }
    try {
      setLoadingServicos(true);
      const r = await api.get("/api/servicos");
      const data = Array.isArray(r.data)
        ? r.data
        : (r.data && (r.data as any).content && Array.isArray((r.data as any).content)
            ? (r.data as any).content
            : []);
      const list: ServicoResumo[] = (data as any[]).map((s) => ({
        servicoId: String((s as any).servicoId ?? ""),
        nome: String((s as any).nome ?? ""),
        descricao: (s as any).descricao ?? null,
        valorPadrao: (s as any).valorPadrao ?? null,
        ativo: (s as any).ativo ?? true,
      }));
      setServicos(list);
    } catch {
      setServicos([]);
    } finally {
      setLoadingServicos(false);
    }
  }

  const anoAtual = new Date().getFullYear();
  const MESES = [
    { value: "01", label: "Janeiro" }, { value: "02", label: "Fevereiro" }, { value: "03", label: "Março" },
    { value: "04", label: "Abril" }, { value: "05", label: "Maio" }, { value: "06", label: "Junho" },
    { value: "07", label: "Julho" }, { value: "08", label: "Agosto" }, { value: "09", label: "Setembro" },
    { value: "10", label: "Outubro" }, { value: "11", label: "Novembro" }, { value: "12", label: "Dezembro" },
  ];
  const ANOS = Array.from({ length: anoAtual - 2019 + 2 }, (_, i) => 2019 + i);

  function abrirModalRegistro() {
    nextRowIdRef.current = 1;
    setClienteBusca("");
    setClienteDropdownAberto(false);
    setFormRegistro({
      clienteId: "",
      descricao: "",
      mensalidades: [{ rowId: nextRowIdRef.current++, mes: String(new Date().getMonth() + 1).padStart(2, "0"), ano: String(anoAtual), valorDigitado: "" }],
    });
    setModalRegistroAberto(true);
    carregarClientes();
    carregarServicos();
  }

  const clientesFiltrados = clientes.filter((c) =>
    c.nome.toLowerCase().includes(clienteBusca.trim().toLowerCase())
  );
  const clienteSelecionado = clientes.find((c) => c.id === formRegistro.clienteId);

  /** Último dia do mês em ISO (yyyy-MM-dd) */
  function ultimoDiaDoMes(mes: string, ano: string): string {
    const y = Number(ano), m = Number(mes);
    if (!y || !m) return "";
    const d = new Date(y, m, 0);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function adicionarMensalidade() {
    setFormRegistro((prev) => ({
      ...prev,
      mensalidades: [...prev.mensalidades, { rowId: nextRowIdRef.current++, mes: "01", ano: String(anoAtual), valorDigitado: "" }],
    }));
  }

  function atualizarMensalidade(index: number, campo: keyof MensalidadeRow, valor: string) {
    setFormRegistro((prev) => ({
      ...prev,
      mensalidades: prev.mensalidades.map((row, i) => (i === index ? { ...row, [campo]: valor } : row)),
    }));
  }

  function removerMensalidade(index: number) {
    if (formRegistro.mensalidades.length <= 1) return;
    setFormRegistro((prev) => ({
      ...prev,
      mensalidades: prev.mensalidades.filter((_, i) => i !== index),
    }));
  }

  const totalMensalidades = formRegistro.mensalidades.reduce(
    (s, row) => s + parseValorReais(row.valorDigitado),
    0
  );

  /** Abre o modal de serviços para preencher o valor da linha (soma dos serviços selecionados). */
  function abrirModalServicosParaValor(rowIndex: number) {
    setModalServicosValorRowIndex(rowIndex);
    setServicosSelecionadosParaValor([]);
    setServicosBuscaValor("");
  }

  /** Soma em reais dos serviços selecionados no modal (valorPadrao da API vem em reais). */
  const somaServicosModalReais = servicos
    .filter((s) => servicosSelecionadosParaValor.includes(s.servicoId))
    .reduce((acc, s) => acc + (s.valorPadrao ?? 0), 0);

  function aplicarServicosAoValor() {
    if (modalServicosValorRowIndex === null) return;
    const valorStr = somaServicosModalReais > 0
      ? somaServicosModalReais.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : "";
    atualizarMensalidade(modalServicosValorRowIndex, "valorDigitado", valorStr);
    setModalServicosValorRowIndex(null);
  }

  function toggleServicoParaValor(servicoId: string) {
    setServicosSelecionadosParaValor((prev) =>
      prev.includes(servicoId) ? prev.filter((id) => id !== servicoId) : [...prev, servicoId]
    );
  }

  async function salvarRegistro() {
    const clienteId = formRegistro.clienteId?.trim() ?? "";
    const itensParaSalvar = formRegistro.mensalidades
      .map((row) => ({
        valor: parseValorReais(row.valorDigitado),
        vencimento: ultimoDiaDoMes(row.mes, row.ano),
        mes: row.mes,
        ano: row.ano,
      }))
      .filter((x) => x.valor > 0 && x.vencimento);
    if (!clienteId || itensParaSalvar.length === 0) {
      setErro("Selecione o cliente e informe ao menos um mês com valor.");
      return;
    }
    setErro(null);
    try {
      for (const item of itensParaSalvar) {
        const basePayload = isMockEnabled()
          ? { clienteId, valor: item.valor, vencimento: item.vencimento, descricao: formRegistro.descricao || undefined }
          : normalizeInadimplenciaToApi({ clienteId, valor: item.valor, vencimento: item.vencimento, descricao: formRegistro.descricao });
        await api.post("/api/inadimplentes", basePayload);
      }
      setModalRegistroAberto(false);
      setMensagemSucesso("Inadimplência(s) registrada(s) com sucesso.");
      invalidateDashboard();
      listar();
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao registrar inadimplência"));
    }
  }

  useEffect(() => {
    listar();
  }, []);

  useEffect(() => {
    carregarClientes();
  }, []);

  useEffect(() => {
    if (!mensagemSucesso) return;
    const t = setTimeout(() => setMensagemSucesso(null), 4000);
    return () => clearTimeout(t);
  }, [mensagemSucesso]);

  /** Inclui EmAberto, PARCIAL, Acordo e equivalentes — exclui só Pago/Quitada e Cancelado/Cancelada */
  const emAberto = itens.filter((i) => {
    const s = String(i.status ?? "EmAberto").toLowerCase();
    return s !== "pago" && s !== "quitada" && s !== "cancelado" && s !== "cancelada";
  });

  /** Agrupa por cliente: soma valor, vencimento mais antigo, maior dias em atraso */
  const agrupadosPorCliente = (() => {
    const map = new Map<string, { clienteNome: string; valor: number; vencimento: string; diasMax: number }>();
    for (const i of emAberto) {
      const id = i.clienteId;
      const nome = i.clienteNome ?? `Cliente #${id}`;
      const valor = i.valor ?? i.valorDevedor ?? 0;
      const dias = diasEmAtraso(i.vencimento);
      const atual = map.get(id);
      if (!atual) {
        map.set(id, { clienteNome: nome, valor, vencimento: i.vencimento, diasMax: dias });
      } else {
        atual.valor += valor;
        if (i.vencimento < atual.vencimento) atual.vencimento = i.vencimento;
        if (dias > atual.diasMax) atual.diasMax = dias;
      }
    }
    return Array.from(map.entries()).map(([clienteId, v]) => ({
      clienteId,
      clienteNome: v.clienteNome,
      valor: v.valor,
      vencimento: v.vencimento,
      diasEmAtraso: v.diasMax,
    }));
  })();

  const totalValor = agrupadosPorCliente.reduce((s, i) => s + i.valor, 0);
  const diasList = emAberto.map((i) => diasEmAtraso(i.vencimento)).filter((d) => d > 0);
  const mediaAtraso = diasList.length ? Math.round(diasList.reduce((a, b) => a + b, 0) / diasList.length) : 0;

  const ordenados = [...agrupadosPorCliente].sort((a, b) => {
    if (!ordenarPor) return 0;
    const mul = ordemAsc ? 1 : -1;
    if (ordenarPor === "cliente")
      return mul * (a.clienteNome.localeCompare(b.clienteNome));
    if (ordenarPor === "valor") return mul * (a.valor - b.valor);
    if (ordenarPor === "dias") return mul * (a.diasEmAtraso - b.diasEmAtraso);
    return 0;
  });

  const totalPaginasInad = Math.max(1, Math.ceil(ordenados.length / itensPorPagina));
  const paginaAtualInad = Math.min(pagina, totalPaginasInad);
  const itensPaginaInad = ordenados.slice((paginaAtualInad - 1) * itensPorPagina, paginaAtualInad * itensPorPagina);

  useEffect(() => {
    if (pagina > totalPaginasInad && totalPaginasInad >= 1) setPagina(1);
  }, [ordenados.length, totalPaginasInad, pagina]);

  function toggleOrdenacao(campo: "cliente" | "valor" | "dias") {
    if (ordenarPor === campo) setOrdemAsc((x) => !x);
    else {
      setOrdenarPor(campo);
      setOrdemAsc(true);
    }
  }

  function saldoDevedorItem(i: Inadimplencia): number {
    const totalDaApi = i.valor ?? i.valorDevedor ?? 0;
    const juros = i.juros ?? 0;
    const valorOriginal = i.valorOriginal != null ? i.valorOriginal : totalDaApi > 0 ? Math.max(0, totalDaApi - juros) : 0;
    return totalDaApi > 0 ? totalDaApi : valorOriginal + juros;
  }

  function descontoNormalizado(valorDigitado: string, saldoDevedor: number): number {
    const descontoLido = parseValorReais(valorDigitado);
    if (!Number.isFinite(descontoLido) || descontoLido <= 0) return 0;
    if (descontoLido >= saldoDevedor) return saldoDevedor;
    return descontoLido;
  }

  function parsePct(s: string): number {
    const norm = s.replace(/\./g, "").replace(",", ".");
    const v = Number(norm);
    return Number.isFinite(v) ? v : 0;
  }

  async function abrirModalAjustarJuros() {
    setModalAjustarJurosAberto(true);
    try {
      setLoadingJurosGlobal(true);
      const res = await api.get("/api/config/juros");
      const cfg = res.data ?? {};
      setJurosGlobal({
        multa: (Number(cfg.multaDiaria ?? 0.0033) * 100).toString().replace(".", ","),
        juros: (Number(cfg.jurosMensal ?? 0.02) * 100).toString().replace(".", ","),
      });
    } catch {
      setJurosGlobal({ multa: "0,33", juros: "2" });
    } finally {
      setLoadingJurosGlobal(false);
    }
  }

  async function salvarJurosGlobal() {
    try {
      setLoadingJurosGlobal(true);
      const multa = parsePct(jurosGlobal.multa);
      const jurosMes = parsePct(jurosGlobal.juros);
      await api.put("/api/config/juros", {
        multaDiaria: multa / 100,
        capMultaPercentual: 0.0999,
        jurosMensal: jurosMes / 100,
      });
      setMensagemSucesso("Configuração de juros salva globalmente.");
      setModalAjustarJurosAberto(false);
      await listar();
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao salvar configuração de juros."));
    } finally {
      setLoadingJurosGlobal(false);
    }
  }

  async function desativarJurosGlobal() {
    try {
      setLoadingJurosGlobal(true);
      await api.put("/api/config/juros", {
        multaDiaria: 0,
        capMultaPercentual: 0,
        jurosMensal: 0,
      });
      setMensagemSucesso("Juros desativados globalmente.");
      setModalAjustarJurosAberto(false);
      await listar();
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao desativar juros."));
    } finally {
      setLoadingJurosGlobal(false);
    }
  }

  async function carregarPagamentosParciais(dividaId: string) {
    setLoadingHistoricoPagamentosParciais((prev) => ({ ...prev, [dividaId]: true }));
    try {
      const res = await api.get(`/api/pagamentos/divida/${dividaId}`);
      const data = res.data;
      const raw = Array.isArray(data) ? data : normalizeListResponse<Record<string, unknown>>(data);
      setHistoricoPagamentosParciais((prev) => ({
        ...prev,
        [dividaId]: raw.map((p) => normalizePagamentoInadimplenciaFromApi(p as Record<string, unknown>)),
      }));
    } catch {
      try {
        const res = await api.get("/api/pagamentos", { params: { dividaId } });
        const raw = normalizeListResponse<Record<string, unknown>>(res.data);
        setHistoricoPagamentosParciais((prev) => ({
          ...prev,
          [dividaId]: raw.map((p) => normalizePagamentoInadimplenciaFromApi(p)),
        }));
      } catch {
        setHistoricoPagamentosParciais((prev) => ({ ...prev, [dividaId]: [] }));
      }
    } finally {
      setLoadingHistoricoPagamentosParciais((prev) => ({ ...prev, [dividaId]: false }));
    }
  }

  async function confirmarPagamentoComModal() {
    if (!modalConfirmacaoPagamento) return;
    const i = modalConfirmacaoPagamento.inadimplencia;
    if (!i.id) {
      setErro("Não foi possível confirmar: ID da inadimplência ausente.");
      return;
    }
    const saldoDevedor = saldoDevedorItem(i);
    const desconto = descontoNormalizado(modalConfirmacaoPagamento.descontoDigitado, saldoDevedor);
    const metodoPagamento = modalConfirmacaoPagamento.metodoPagamento.trim();
    const observacao = modalConfirmacaoPagamento.observacao.trim();
    const dataPagamento = modalConfirmacaoPagamento.dataPagamento || new Date().toISOString().slice(0, 10);

    if (!metodoPagamento) {
      setErro("Método de pagamento é obrigatório.");
      return;
    }
    setLoadingConfirmacaoPagamento(true);
    setErro(null);
    try {
      await api.patch(`/api/inadimplentes/${i.id}`, {
        status: "Pago",
        desconto,
        metodoPagamento,
        observacao: observacao || undefined,
        dataPagamento,
      });
      setMensagemSucesso("Pagamento confirmado com sucesso.");
      setModalConfirmacaoPagamento(null);
      invalidateDashboard();
      await listar();
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Não foi possível confirmar o pagamento. Verifique os dados e tente novamente."));
    } finally {
      setLoadingConfirmacaoPagamento(false);
    }
  }

  function abrirModalCancelarInadimplencia(item: Inadimplencia, nomeCliente: string) {
    setInadimplenciaParaCancelar({ item, nomeCliente });
  }

  async function executarCancelamento() {
    if (!inadimplenciaParaCancelar || inadimplenciaParaCancelar.item.id == null) return;
    const id = inadimplenciaParaCancelar.item.id;
    setInadimplenciaParaCancelar(null);
    try {
      setErro(null);
      const res = await api.delete(`/api/inadimplentes/${id}`);
      // 204 No Content ou 2xx = sucesso: atualiza a lista na hora
      if (res?.status === 204 || (res?.status >= 200 && res?.status < 300)) {
        setItens((prev) => prev.filter((i) => i.id !== id));
      }
      setMensagemSucesso("Inadimplência cancelada.");
      invalidateDashboard();
      await listar();
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao cancelar inadimplência"));
    }
  }

  /** Copia o e-mail formatado (HTML) e abre o Gmail; usuário cola (Ctrl+V) no corpo. */
  async function enviarEmailCobranca(item: Inadimplencia, nomeCliente: string, emailCliente?: string) {
    const copiou = await copyCobrancaEmailToClipboard(item, nomeCliente);
    if (copiou) {
      setToastEmailFormatado(true);
      setTimeout(() => setToastEmailFormatado(false), 5000);
    }
    const gmailUrl = buildGmailComposeUrl(item, nomeCliente, emailCliente, true);
    openGmailCompose(gmailUrl);
  }

  return (
    <div className="page-inadimplentes">
      <p className="page-inadimplentes__contexto">Sistema de Gestão de Inadimplentes</p>
      <h1 className="page-inadimplentes__title">Lista de Inadimplentes</h1>
      <p className="page-inadimplentes__subtitle">Clientes com pagamentos em atraso</p>

      {mensagemSucesso && <p className="toast toast--sucesso">{mensagemSucesso}</p>}
      {toastEmailFormatado && (
        <p className="toast toast--sucesso">
          E-mail formatado copiado. Cole no corpo da mensagem no Gmail (Ctrl+V) para usar o layout.
        </p>
      )}
      {erro && <p className="page-inadimplentes__erro">{erro}</p>}

      <div className="page-inadimplentes__acao-topo">
        <button type="button" className="btn btn--primary" onClick={abrirModalRegistro}>
          <PlusIcon />
          Registrar inadimplência
        </button>
        <button type="button" className="btn btn--secondary" onClick={abrirModalAjustarJuros}>
          Ajustar juros
        </button>
      </div>

      <div className="page-inadimplentes__cards">
        <div className="page-inadimplentes__card">
          <span className="page-inadimplentes__card-label">
            Total de inadimplentes
            <InfoIcon />
          </span>
          <span className="page-inadimplentes__card-value">
            {loading ? "—" : agrupadosPorCliente.length}
          </span>
        </div>
        <div className="page-inadimplentes__card">
          <span className="page-inadimplentes__card-label">Valor total em aberto</span>
          <span className="page-inadimplentes__card-value">
            {loading ? "—" : totalValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
        </div>
        <div className="page-inadimplentes__card">
          <span className="page-inadimplentes__card-label">Média de atraso</span>
          <span className="page-inadimplentes__card-value">
            {loading ? "—" : `${mediaAtraso} dias`}
          </span>
        </div>
      </div>

      <section className="page-inadimplentes__tabela-secao">
        <h2 className="page-inadimplentes__tabela-titulo">Clientes Inadimplentes</h2>
        <div className="page-inadimplentes__tabela-wrap">
          <table className="page-inadimplentes__tabela">
            <thead>
              <tr>
                <th>
                  <button type="button" className="page-inadimplentes__th" onClick={() => toggleOrdenacao("cliente")}>
                    Cliente <SortIcon />
                  </button>
                </th>
                <th>
                  <button type="button" className="page-inadimplentes__th" onClick={() => toggleOrdenacao("valor")}>
                    Valor <SortIcon />
                  </button>
                </th>
                <th>
                  <button type="button" className="page-inadimplentes__th" onClick={() => toggleOrdenacao("dias")}>
                    Dias em atraso <SortIcon />
                  </button>
                </th>
                <th className="page-inadimplentes__th-acao">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="page-inadimplentes__loading">Carregando...</td>
                </tr>
              ) : ordenados.length === 0 ? (
                <tr>
                  <td colSpan={4} className="page-inadimplentes__vazio">Nenhum inadimplente em aberto.</td>
                </tr>
              ) : (
                itensPaginaInad.map((d) => (
                  <tr key={d.clienteId}>
                    <td>{d.clienteNome}</td>
                    <td>{d.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                    <td>{d.diasEmAtraso} dias</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn--secondary btn--small page-inadimplentes__btn-meses"
                        onClick={() => setDetalheClienteId(d.clienteId)}
                      >
                        <EyeIcon /> Ver honorários
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      {ordenados.length > itensPorPagina && (
        <div className="page-inadimplentes__paginacao">
          <button
            type="button"
            className="btn btn--secondary btn--small"
            disabled={paginaAtualInad <= 1}
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
          >
            Anterior
          </button>
          <span className="page-inadimplentes__paginacao-info">
            Página {paginaAtualInad} de {totalPaginasInad} ({ordenados.length} inadimplente{ordenados.length !== 1 ? "s" : ""})
          </span>
          <button
            type="button"
            className="btn btn--secondary btn--small"
            disabled={paginaAtualInad >= totalPaginasInad}
            onClick={() => setPagina((p) => Math.min(totalPaginasInad, p + 1))}
          >
            Próxima
          </button>
        </div>
      )}
      </section>

      {detalheClienteId !== null && (() => {
        const mensalidadesCliente = emAberto
          .filter((i) => i.clienteId === detalheClienteId)
          .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
        const nomeCliente = agrupadosPorCliente.find((c) => c.clienteId === detalheClienteId)?.clienteNome ?? `Cliente #${detalheClienteId}`;
        const emailCliente = clientes.find((c) => c.id === detalheClienteId)?.email ?? "";
        const valorTotalLinha = (i: typeof mensalidadesCliente[0]) => {
          const total = i.valor ?? i.valorDevedor ?? 0;
          if (total > 0) return total;
          const orig = i.valorOriginal ?? 0;
          const j = i.juros ?? 0;
          return orig + j;
        };
        const totalDetalhe = mensalidadesCliente.reduce((s, i) => s + valorTotalLinha(i), 0);
        return (
          <div className="modal-overlay" onClick={() => setDetalheClienteId(null)}>
            <div className="modal modal--detalhe-meses" onClick={(e) => e.stopPropagation()}>
              <div className="modal__cabecalho">
                <h2 className="modal__titulo">Meses em aberto — {nomeCliente}</h2>
                <button type="button" className="modal__fechar" onClick={() => setDetalheClienteId(null)} aria-label="Fechar">
                  <CloseIcon />
                </button>
              </div>
              <div className="modal__detalhe-meses">
                <table className="page-inadimplentes__tabela page-inadimplentes__tabela--detalhe">
                  <thead>
                    <tr>
                      <th>Mês/Ano</th>
                      <th>Vencimento</th>
                      <th className="page-inadimplentes__cell-num">Valor original</th>
                      <th className="page-inadimplentes__cell-num">Juros</th>
                      <th className="page-inadimplentes__cell-num">Valor total</th>
                      <th className="page-inadimplentes__th-acao">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mensalidadesCliente.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="page-inadimplentes__vazio">
                          Nenhum mês em aberto para este cliente.
                        </td>
                      </tr>
                    ) : (
                      mensalidadesCliente.map((i) => {
                        const totalDaApi = i.valor ?? i.valorDevedor ?? 0;
                        const juros = i.juros ?? 0;
                        const valorOriginal =
                          i.valorOriginal != null ? i.valorOriginal : totalDaApi > 0 ? Math.max(0, totalDaApi - juros) : 0;
                        const valorTotal = totalDaApi > 0 ? totalDaApi : valorOriginal + juros;
                        const key = i.id ?? `${i.vencimento}-${i.valor}`;
                        const aberta = linhaDetalheAbertaId === String(key);
                        const pagamentosDoItem = i.pagamentos ?? [];
                        const pagamentosFallback = i.id ? historicoPagamentosParciais[i.id] : undefined;
                        const listaPagamentos = ordenarPagamentosPorData(
                          pagamentosDoItem.length > 0 ? pagamentosDoItem : (pagamentosFallback ?? [])
                        );
                        const loadingHist = Boolean(i.id && loadingHistoricoPagamentosParciais[i.id]);
                        const mostrarLoadingPagamentos =
                          loadingHist && listaPagamentos.length === 0 && pagamentosDoItem.length === 0;
                        return (
                          <>
                            <tr
                              key={key}
                              className="page-inadimplentes__linha-mes"
                               onClick={async () => {
                                if (linhaDetalheAbertaId === String(key)) {
                                  setLinhaDetalheAbertaId(null);
                                } else {
                                  setLinhaDetalheAbertaId(String(key));
                                  if (i.id && (i.pagamentos?.length ?? 0) === 0) {
                                    await carregarPagamentosParciais(i.id);
                                  }
                                }
                              }}
                              style={{ cursor: "pointer" }}
                            >
                              <td>{formatarMesAno(i.vencimento)}</td>
                              <td>{formatarData(i.vencimento)}</td>
                              <td className="page-inadimplentes__cell-num">
                                {valorOriginal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                              </td>
                              <td className="page-inadimplentes__cell-num">
                                {juros.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                              </td>
                              <td className="page-inadimplentes__cell-num">
                                {valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                              </td>
                              <td>
                                <div className="page-inadimplentes__acoes-detalhe">
                                <button
                                  type="button"
                                  className="page-inadimplentes__btn-icone page-inadimplentes__btn-icone--confirmar"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    i.id != null &&
                                      setModalConfirmacaoPagamento({
                                        inadimplencia: i,
                                        nomeCliente,
                                        descontoDigitado: "",
                                        metodoPagamento: "",
                                        observacao: "",
                                        dataPagamento: new Date().toISOString().slice(0, 10),
                                      });
                                  }}
                                  disabled={i.id == null}
                                  title="Confirmar pagamento"
                                  aria-label="Confirmar pagamento"
                                >
                                  <CheckIcon />
                                </button>
                                <button
                                  type="button"
                                  className="page-inadimplentes__btn-icone page-inadimplentes__btn-icone--email"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    enviarEmailCobranca(i, nomeCliente, emailCliente);
                                  }}
                                  title="Enviar e-mail de cobrança deste mês (abre cliente de e-mail)"
                                  aria-label="Enviar e-mail de cobrança"
                                >
                                  <EmailSendIcon />
                                </button>
                                  <button
                                    type="button"
                                    className="page-inadimplentes__btn-icone page-inadimplentes__btn-icone--cancelar"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      abrirModalCancelarInadimplencia(i, nomeCliente);
                                    }}
                                    disabled={i.id == null}
                                    title="Cancelar inadimplência deste mês"
                                    aria-label="Cancelar inadimplência"
                                  >
                                    <CancelIcon />
                                  </button>
                                  <button
                                    type="button"
                                    className="page-inadimplentes__btn-icone page-inadimplentes__btn-icone--pagamento"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      i.id != null &&
                                        setModalPagamentoParcial({
                                          inadimplencia: i,
                                          nomeCliente,
                                          valorDigitado: "",
                                          dataPagamento: new Date().toISOString().slice(0, 10),
                                          metodoPagamento: "PIX",
                                        });
                                    }}
                                    disabled={i.id == null || valorTotal <= 0}
                                    title="Registrar pagamento parcial deste mês"
                                    aria-label="Registrar pagamento parcial deste mês"
                                  >
                                    R$
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {aberta && (
                              <tr className="page-inadimplentes__detalhe-row">
                                <td colSpan={6}>
                                  <div className="page-inadimplentes__detalhe">
                                    <label className="modal__label">Pagamentos</label>
                                    {!i.id ? (
                                      <p>Não foi possível carregar o histórico (dívida sem ID).</p>
                                    ) : mostrarLoadingPagamentos ? (
                                      <p>Carregando pagamentos...</p>
                                    ) : listaPagamentos.length === 0 ? (
                                      <p>Nenhum pagamento registrado.</p>
                                    ) : (
                                      <table className="page-inadimplentes__tabela page-inadimplentes__tabela--detalhe">
                                        <thead>
                                          <tr>
                                            <th>Data do pagamento</th>
                                            <th className="page-inadimplentes__cell-num">Valor</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {listaPagamentos.map((p) => (
                                            <tr key={p.pagamentoId ?? `${p.dataPagamento}-${p.valorPago}`}>
                                              <td>{formatarData(p.dataPagamento)}</td>
                                              <td className="page-inadimplentes__cell-num">
                                                {p.valorPago.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })
                    )}
                  </tbody>
                </table>
                <p className="modal__total-label">
                  Total: <strong>{totalDetalhe.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                </p>
              </div>
              <div className="modal__botoes">
                <button type="button" className="btn btn--primary" onClick={() => setDetalheClienteId(null)}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {inadimplenciaParaCancelar && (
        <div className="modal-overlay" onClick={() => setInadimplenciaParaCancelar(null)}>
          <div className="modal modal--confirmar-exclusao" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__titulo">Apagar inadimplência?</h2>
            <p className="modal__texto-confirmacao">
              Tem certeza que deseja apagar a inadimplência do mês{" "}
              <strong>{formatarMesAno(inadimplenciaParaCancelar.item.vencimento)}</strong> do cliente{" "}
              <strong>{inadimplenciaParaCancelar.nomeCliente}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="modal__botoes">
              <button type="button" className="btn btn--secondary" onClick={() => setInadimplenciaParaCancelar(null)}>
                Cancelar
              </button>
              <button type="button" className="btn btn--danger" onClick={executarCancelamento}>
                Apagar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalAjustarJurosAberto && (
        <div className="modal-overlay" onClick={() => !loadingJurosGlobal && setModalAjustarJurosAberto(false)}>
          <div className="modal modal--cadastro modal--pagamento" onClick={(e) => e.stopPropagation()}>
            <p className="modal__eyebrow">AJUSTAR JUROS</p>
            <h2 className="modal__titulo">Configuração global</h2>
            <div className="modal__grid">
              <label className="modal__label modal__label--full">Multa diária (% ao dia)</label>
              <input
                type="text"
                className="modal__input modal__input--full"
                value={jurosGlobal.multa}
                onChange={(e) => setJurosGlobal((prev) => ({ ...prev, multa: e.target.value }))}
                disabled={loadingJurosGlobal}
              />
              <label className="modal__label modal__label--full">Juros ao mês (%)</label>
              <input
                type="text"
                className="modal__input modal__input--full"
                value={jurosGlobal.juros}
                onChange={(e) => setJurosGlobal((prev) => ({ ...prev, juros: e.target.value }))}
                disabled={loadingJurosGlobal}
              />
            </div>
            <div className="modal__botoes modal__botoes--duplo">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={desativarJurosGlobal}
                disabled={loadingJurosGlobal}
              >
                Desativar juros
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setModalAjustarJurosAberto(false)}
                disabled={loadingJurosGlobal}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={salvarJurosGlobal}
                disabled={loadingJurosGlobal}
              >
                {loadingJurosGlobal ? "Salvando..." : "Salvar juros"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalConfirmacaoPagamento && (
        <div className="modal-overlay" onClick={() => !loadingConfirmacaoPagamento && setModalConfirmacaoPagamento(null)}>
          <div className="modal modal--cadastro modal--pagamento" onClick={(e) => e.stopPropagation()}>
            <p className="modal__eyebrow">CONFIRMAR PAGAMENTO</p>
            <h2 className="modal__titulo">{modalConfirmacaoPagamento.nomeCliente}</h2>
            <p className="modal__texto-confirmacao modal__label--full">
              Mês: <strong>{formatarMesAno(modalConfirmacaoPagamento.inadimplencia.vencimento)}</strong>{" "}
              Vencimento: <strong>{formatarData(modalConfirmacaoPagamento.inadimplencia.vencimento)}</strong>
            </p>
            <div className="modal__grid">
              {(() => {
                const i = modalConfirmacaoPagamento.inadimplencia;
                const totalDaApi = i.valor ?? i.valorDevedor ?? 0;
                const juros = i.juros ?? 0;
                const valorOriginal =
                  i.valorOriginal != null ? i.valorOriginal : totalDaApi > 0 ? Math.max(0, totalDaApi - juros) : 0;
                const saldoDevedor = totalDaApi > 0 ? totalDaApi : valorOriginal + juros;
                const desconto = descontoNormalizado(modalConfirmacaoPagamento.descontoDigitado, saldoDevedor);
                const totalAposDesconto = Math.max(0, saldoDevedor - desconto);
                return (
                  <>
                    <div className="modal__campo-inline modal__input--full modal__resumo-item">
                      <span>Juros</span>
                      <strong>{juros.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                    </div>
                    <div className="modal__campo-inline modal__input--full modal__resumo-item">
                      <span>Saldo devedor</span>
                      <strong>{saldoDevedor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                    </div>
                    <div className="modal__campo-inline modal__input--full modal__resumo-item modal__resumo-item--destaque">
                      <span>Total após desconto</span>
                      <strong>{totalAposDesconto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                    </div>
                  </>
                );
              })()}

              <div className="modal__linha-dois-campos">
                <div className="modal__campo-stack">
                  <label className="modal__label">Desconto (R$)</label>
                  <input
                    placeholder="0,00"
                    value={modalConfirmacaoPagamento.descontoDigitado}
                    onChange={(e) =>
                      setModalConfirmacaoPagamento((prev) => (prev ? { ...prev, descontoDigitado: e.target.value } : prev))
                    }
                    className="modal__input"
                    disabled={loadingConfirmacaoPagamento}
                  />
                </div>
                <div className="modal__campo-stack">
                  <label className="modal__label modal__label--required">Método de pagamento</label>
                  <select
                    value={modalConfirmacaoPagamento.metodoPagamento}
                    onChange={(e) =>
                      setModalConfirmacaoPagamento((prev) => (prev ? { ...prev, metodoPagamento: e.target.value } : prev))
                    }
                    className="modal__input modal__select"
                    disabled={loadingConfirmacaoPagamento}
                  >
                    <option value="">Selecione</option>
                    <option value="PIX">PIX</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Cartão">Cartão</option>
                    <option value="Transferência">Transferência</option>
                  </select>
                </div>
              </div>

              <label className="modal__label modal__label--full">Data do pagamento</label>
              <input
                type="date"
                value={modalConfirmacaoPagamento.dataPagamento}
                onChange={(e) =>
                  setModalConfirmacaoPagamento((prev) => (prev ? { ...prev, dataPagamento: e.target.value } : prev))
                }
                className="modal__input modal__input--full"
                disabled={loadingConfirmacaoPagamento}
              />

              <label className="modal__label modal__label--full">Observação</label>
              <textarea
                placeholder="Opcional"
                value={modalConfirmacaoPagamento.observacao}
                onChange={(e) =>
                  setModalConfirmacaoPagamento((prev) => (prev ? { ...prev, observacao: e.target.value } : prev))
                }
                className="modal__input modal__input--full"
                rows={3}
                disabled={loadingConfirmacaoPagamento}
              />
            </div>
            <div className="modal__botoes modal__botoes--duplo">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setModalConfirmacaoPagamento(null)}
                disabled={loadingConfirmacaoPagamento}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={confirmarPagamentoComModal}
                disabled={loadingConfirmacaoPagamento || !modalConfirmacaoPagamento.metodoPagamento.trim()}
              >
                {loadingConfirmacaoPagamento ? "Confirmando..." : "Confirmar pagamento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalPagamentoParcial && (
        <div className="modal-overlay" onClick={() => setModalPagamentoParcial(null)}>
          <div className="modal modal--cadastro modal--pagamento" onClick={(e) => e.stopPropagation()}>
            <p className="modal__eyebrow">PAGAMENTO PARCIAL</p>
            <h2 className="modal__titulo">{modalPagamentoParcial.nomeCliente}</h2>
            <p className="modal__texto-confirmacao">
              Mês: <strong>{formatarMesAno(modalPagamentoParcial.inadimplencia.vencimento)}</strong>{" "}
              Vencimento: <strong>{formatarData(modalPagamentoParcial.inadimplencia.vencimento)}</strong>
            </p>
            <div className="modal__grid">
              {(() => {
                const i = modalPagamentoParcial.inadimplencia;
                const totalDaApi = i.valor ?? i.valorDevedor ?? 0;
                const juros = i.juros ?? 0;
                const valorOriginal =
                  i.valorOriginal != null ? i.valorOriginal : totalDaApi > 0 ? Math.max(0, totalDaApi - juros) : 0;
                const valorTotal = totalDaApi > 0 ? totalDaApi : valorOriginal + juros;
                return (
                  <>
                    <div className="modal__campo-inline modal__input--full modal__resumo-item">
                      <span>Valor original</span>
                      <strong>{valorOriginal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                    </div>
                    <div className="modal__campo-inline modal__input--full modal__resumo-item">
                      <span>Juros</span>
                      <strong>{juros.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                    </div>
                    <div className="modal__campo-inline modal__input--full modal__resumo-item modal__resumo-item--destaque">
                      <span>Saldo devedor</span>
                      <strong>{valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                    </div>
                  </>
                );
              })()}

              <label className="modal__label modal__label--required">Valor a pagar agora</label>
              <input
                placeholder="0,00"
                value={modalPagamentoParcial.valorDigitado}
                onChange={(e) =>
                  setModalPagamentoParcial((prev) => (prev ? { ...prev, valorDigitado: e.target.value } : prev))
                }
                className="modal__input"
              />

              <label className="modal__label">Data do pagamento</label>
              <input
                type="date"
                value={modalPagamentoParcial.dataPagamento}
                onChange={(e) =>
                  setModalPagamentoParcial((prev) => (prev ? { ...prev, dataPagamento: e.target.value } : prev))
                }
                className="modal__input"
              />

              <label className="modal__label">Método de pagamento</label>
              <select
                value={modalPagamentoParcial.metodoPagamento}
                onChange={(e) =>
                  setModalPagamentoParcial((prev) => (prev ? { ...prev, metodoPagamento: e.target.value } : prev))
                }
                className="modal__input modal__select"
              >
                <option value="PIX">PIX</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Cartão">Cartão</option>
                <option value="Transferência">Transferência</option>
              </select>
            </div>
            <div className="modal__botoes modal__botoes--duplo">
              <button type="button" className="btn btn--secondary" onClick={() => setModalPagamentoParcial(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={async () => {
                  if (!modalPagamentoParcial) return;
                  const i = modalPagamentoParcial.inadimplencia;
                  const totalDaApi = i.valor ?? i.valorDevedor ?? 0;
                  const juros = i.juros ?? 0;
                  const valorOriginal =
                    i.valorOriginal != null ? i.valorOriginal : totalDaApi > 0 ? Math.max(0, totalDaApi - juros) : 0;
                  const saldoDevedor = totalDaApi > 0 ? totalDaApi : valorOriginal + juros;
                  const valorReais = parseValorReais(modalPagamentoParcial.valorDigitado);
                  if (!valorReais || valorReais <= 0) {
                    setErro("Informe um valor maior que zero para o pagamento parcial.");
                    return;
                  }
                  if (valorReais > saldoDevedor) {
                    setErro("Valor não pode ser maior que o saldo devedor.");
                    return;
                  }
                  setLoading(true);
                  setErro(null);
                  try {
                    const valorPagoCentavos = Math.round(valorReais * 100);
                    await api.post("/api/pagamentos", {
                      dividaId: i.id,
                      valorPago: valorPagoCentavos,
                      dataPagamento: modalPagamentoParcial.dataPagamento || new Date().toISOString().slice(0, 10),
                      metodoPagamento: modalPagamentoParcial.metodoPagamento || "PIX",
                    });
                    setModalPagamentoParcial(null);
                    invalidateDashboard();
                    await listar();
                    setMensagemSucesso("Pagamento parcial registrado com sucesso.");
                  } catch (e: unknown) {
                    setErro(
                      getApiErrorMessage(
                        e,
                        "Não foi possível registrar o pagamento parcial. Verifique o valor e tente novamente."
                      )
                    );
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
              >
                {loading ? "Registrando…" : "Registrar pagamento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalRegistroAberto && (
        <div className="modal-overlay" onClick={() => setModalRegistroAberto(false)}>
          <div className="modal modal--inadimplencia" onClick={(e) => e.stopPropagation()}>
            <div className="modal__cabecalho">
              <h2 className="modal__titulo">Registro de Inadimplência</h2>
              <button type="button" className="modal__fechar" onClick={() => setModalRegistroAberto(false)} aria-label="Fechar">
                <CloseIcon />
              </button>
            </div>
            <div className="modal__campos">
              <label className="modal__label">Cliente *</label>
              <div className="modal__cliente-combobox">
                <input
                  ref={clienteInputRef}
                  type="text"
                  autoComplete="off"
                  placeholder="Digite para buscar o cliente..."
                  value={clienteDropdownAberto ? clienteBusca : (clienteSelecionado ? clienteSelecionado.nome : clienteBusca)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setClienteBusca(v);
                    setClienteDropdownAberto(true);
                    const encontrado = clientes.find((c) => c.nome.toLowerCase() === v.trim().toLowerCase());
                    setFormRegistro((prev) => ({ ...prev, clienteId: encontrado?.id ?? "" }));
                  }}
                  onFocus={() => {
                    setClienteDropdownAberto(true);
                    if (clienteSelecionado && clienteBusca !== clienteSelecionado.nome) setClienteBusca(clienteSelecionado.nome);
                  }}
                  onBlur={() => setTimeout(() => setClienteDropdownAberto(false), 150)}
                  className="modal__input"
                  aria-expanded={clienteDropdownAberto}
                  aria-haspopup="listbox"
                  aria-controls="cliente-listbox"
                  id="cliente-input"
                />
                {clienteDropdownAberto && (
                  <ul
                    id="cliente-listbox"
                    className="modal__cliente-listbox"
                    role="listbox"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {clientesFiltrados.length === 0 ? (
                      <li className="modal__cliente-listbox-vazio">Nenhum cliente encontrado</li>
                    ) : (
                      clientesFiltrados.map((c) => (
                        <li
                          key={c.id ?? ""}
                          role="option"
                          aria-selected={formRegistro.clienteId === c.id}
                          className="modal__cliente-opcao"
                          onMouseDown={() => {
                            setFormRegistro((prev) => ({ ...prev, clienteId: c.id ?? "" }));
                            setClienteBusca(c.nome);
                            setClienteDropdownAberto(false);
                            clienteInputRef.current?.blur();
                          }}
                        >
                          <span className="modal__cliente-opcao-nome">{c.nome}</span>
                          {c.cpf && (
                            <span className="modal__cliente-opcao-doc">{formatCpfCnpj(c.cpf)}</span>
                          )}
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>

              <div className="modal__mensalidades-wrap">
                <div className="modal__mensalidades-header">
                  <span className="modal__label">Honorários em aberto</span>
                  <button type="button" className="btn btn--secondary btn--small" onClick={adicionarMensalidade}>
                    <PlusIcon /> Adicionar honorário
                  </button>
                </div>
                <div className="modal__mensalidades-list">
                  {formRegistro.mensalidades.map((row, index) => (
                    <div key={row.rowId} className="modal__mensalidade-row">
                      <select
                        value={row.mes}
                        onChange={(e) => atualizarMensalidade(index, "mes", e.target.value)}
                        className="modal__input modal__select modal__input--mes"
                        aria-label="Mês"
                      >
                        {MESES.map((op) => (
                          <option key={op.value} value={op.value}>{op.label}</option>
                        ))}
                      </select>
                      <select
                        value={row.ano}
                        onChange={(e) => atualizarMensalidade(index, "ano", e.target.value)}
                        className="modal__input modal__select modal__input--ano"
                        aria-label="Ano"
                      >
                        {ANOS.map((a) => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                      <div className="modal__valor-wrap">
                        <input
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          placeholder="Ex: 150 ou 150.50"
                          value={row.valorDigitado}
                          onChange={(e) => atualizarMensalidade(index, "valorDigitado", e.target.value ?? "")}
                          className="modal__input modal__input--valor"
                        />
                        {!isMockEnabled() && servicos.length > 0 && (
                          <button
                            type="button"
                            className="modal__valor-add"
                            onClick={() => abrirModalServicosParaValor(index)}
                            title="Selecionar serviços e somar valor"
                            aria-label="Adicionar valor a partir dos serviços"
                          >
                            +
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        className="modal__mensalidade-remover"
                        onClick={() => removerMensalidade(index)}
                        disabled={formRegistro.mensalidades.length <= 1}
                        aria-label="Remover mês"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="modal__total-label">
                  Total que o cliente deve: <strong>{totalMensalidades.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                </p>
              </div>

              <label className="modal__label">Descrição da dívida</label>
              <textarea
                placeholder="Descreva os detalhes da inadimplência (opcional)"
                value={formRegistro.descricao}
                onChange={(e) => setFormRegistro((prev) => ({ ...prev, descricao: e.target.value }))}
                className="modal__input modal__textarea"
                rows={2}
              />
            </div>
            <div className="modal__botoes">
              <button type="button" className="btn btn--secondary" onClick={() => setModalRegistroAberto(false)}>
                Cancelar
              </button>
              <button type="button" className="btn btn--primary" onClick={salvarRegistro}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalServicosValorRowIndex !== null &&
        createPortal(
          <div
            className="modal-overlay"
            onClick={() => setModalServicosValorRowIndex(null)}
          >
            <div
              className="modal modal--cadastro modal--servicos-valor"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="modal__titulo">Selecionar serviços (soma do valor)</h2>
              <p className="modal__servicos-valor-desc">
                Marque os serviços prestados. O valor será somado e aplicado ao campo de valor.
              </p>
              {loadingServicos ? (
                <p className="modal__servicos-status">Carregando serviços...</p>
              ) : (
              <>
              <input
                type="text"
                className="modal__input modal__input--full"
                placeholder="Pesquisar serviço..."
                value={servicosBuscaValor}
                onChange={(e) => setServicosBuscaValor(e.target.value)}
                aria-label="Pesquisar serviço"
              />
              <div className="modal__servicos-list modal__servicos-list--valor">
                {servicos
                  .filter((s) => s.ativo ?? true)
                  .filter((s) => {
                    const termo = servicosBuscaValor.trim().toLowerCase();
                    if (!termo) return true;
                    const nome = (s.nome ?? "").toLowerCase();
                    const descricao = (s.descricao ?? "").toLowerCase();
                    return nome.includes(termo) || descricao.includes(termo);
                  })
                  .map((s) => {
                    const valorReais = s.valorPadrao ?? 0;
                    const checked = servicosSelecionadosParaValor.includes(s.servicoId);
                    return (
                      <label key={s.servicoId || s.nome} className="modal__servico-item modal__servico-item--valor">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleServicoParaValor(s.servicoId)}
                        />
                        <span className="modal__servico-nome">{s.nome}</span>
                        <span className="modal__servico-valor">
                          {valorReais > 0
                            ? valorReais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                            : "—"}
                        </span>
                      </label>
                    );
                  })}
                {servicos
                  .filter((s) => s.ativo ?? true)
                  .filter((s) => {
                    const termo = servicosBuscaValor.trim().toLowerCase();
                    if (!termo) return true;
                    const nome = (s.nome ?? "").toLowerCase();
                    const descricao = (s.descricao ?? "").toLowerCase();
                    return nome.includes(termo) || descricao.includes(termo);
                  }).length === 0 && (
                    <p className="modal__servicos-status">Nenhum serviço encontrado para a busca informada.</p>
                  )}
              </div>
              </>
              )}
              <p className="modal__total-label modal__total-label--servicos">
                Total: <strong>{somaServicosModalReais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
              </p>
              <div className="modal__botoes">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setModalServicosValorRowIndex(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={aplicarServicosAoValor}
                >
                  Aplicar ao valor
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="page-inadimplentes__info-icon" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="9" r="1.5" fill="currentColor" stroke="none" />
      <path d="M12 11.5v5" />
    </svg>
  );
}

function SortIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m7 15 5 5 5-5" />
      <path d="m7 9 5-5 5 5" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function EmailSendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      <path d="M16 14h6" />
      <path d="m19 11 3 3-3 3" />
    </svg>
  );
}

function CancelIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}
