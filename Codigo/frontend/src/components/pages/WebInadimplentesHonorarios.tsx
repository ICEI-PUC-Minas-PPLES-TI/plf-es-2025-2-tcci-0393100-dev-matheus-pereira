import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, getApiErrorMessage, isMockEnabled, normalizeListResponse } from "@/lib/api";
import {
  normalizeClienteFromApi,
  normalizeInadimplenciaFromApi,
  normalizePagamentoInadimplenciaFromApi,
} from "@/lib/apiNormalizers";
import { invalidateDashboard } from "@/lib/dashboardRefresh";
import {
  diasEmAtraso,
  formatarData,
  formatarMesAno,
  formatarMoeda,
  formatCpfCnpj,
  isInadimplenciaEmAberto,
  ordenarPagamentosPorData,
  saldoDevedorItem,
  valoresHonorario,
} from "@/lib/inadimplentesUtils";
import {
  buildGmailComposeUrl,
  buildWhatsAppCobrancaUrl,
  copyCobrancaEmailToClipboard,
  normalizeTelefoneParaWhatsApp,
  openGmailCompose,
  openWhatsAppCobranca,
} from "@/lib/mailtoCobranca";
import { parseValorReais } from "@/lib/valorBrasil";
import type { Cliente, Inadimplencia, PagamentoInadimplencia } from "@/types/api";

export default function WebInadimplentesHonorarios() {
  const { clienteId } = useParams<{ clienteId: string }>();
  const navigate = useNavigate();
  const [itens, setItens] = useState<Inadimplencia[]>([]);
  const [cliente, setCliente] = useState<Pick<Cliente, "id" | "nome" | "cpf" | "email" | "celular" | "telefone"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [toastEmailFormatado, setToastEmailFormatado] = useState(false);
  const [historicoPagamentosParciais, setHistoricoPagamentosParciais] = useState<Record<string, PagamentoInadimplencia[]>>({});
  const [loadingHistoricoPagamentosParciais, setLoadingHistoricoPagamentosParciais] = useState<Record<string, boolean>>({});
  const [inadimplenciaParaCancelar, setInadimplenciaParaCancelar] = useState<{ item: Inadimplencia; nomeCliente: string } | null>(null);
  const [modalPagamento, setModalPagamento] = useState<{
    tipo: "total" | "parcial";
    inadimplencia: Inadimplencia;
    nomeCliente: string;
    descontoDigitado: string;
    valorParcialDigitado: string;
    metodoPagamento: string;
    observacao: string;
    dataPagamento: string;
  } | null>(null);
  const [salvandoPagamento, setSalvandoPagamento] = useState(false);
  const [modalCobrancaCanal, setModalCobrancaCanal] = useState<{ inadimplencia: Inadimplencia } | null>(null);
  const [loadingCobrancaCanal, setLoadingCobrancaCanal] = useState(false);
  const [pagina, setPagina] = useState(1);
  const itensPorPagina = 3;

  const nomeCliente = cliente?.nome ?? itens[0]?.clienteNome ?? `Cliente #${clienteId}`;

  const carregarPagamentosParciais = useCallback(async (dividaId: string) => {
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
  }, []);

  const listar = useCallback(async () => {
    if (!clienteId) return;
    try {
      setLoading(true);
      setErro(null);
      const r = await api.get("/api/inadimplentes", { params: { paginado: false } });
      const rawList = normalizeListResponse<Record<string, unknown>>(r.data);
      const todos = isMockEnabled()
        ? (rawList as Inadimplencia[])
        : rawList.map((item) => normalizeInadimplenciaFromApi(item));
      const doCliente = todos
        .filter((i) => i.clienteId === clienteId && isInadimplenciaEmAberto(i))
        .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
      setItens(doCliente);

      for (const item of doCliente) {
        if (item.id && (item.pagamentos?.length ?? 0) === 0) {
          void carregarPagamentosParciais(item.id);
        }
      }
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao carregar honorários"));
    } finally {
      setLoading(false);
    }
  }, [clienteId, carregarPagamentosParciais]);

  useEffect(() => {
    if (!clienteId) return;
    void (async () => {
      try {
        const r = await api.get("/api/clientes", { params: { page: 0, size: 500 } });
        const list = normalizeListResponse<Record<string, unknown>>(r.data);
        const found = list
          .map((c) => normalizeClienteFromApi(c))
          .find((c) => c.id === clienteId);
        if (found) {
          setCliente({
            id: found.id ?? "",
            nome: found.nome,
            cpf: found.cpf,
            email: found.email,
            celular: found.celular,
            telefone: found.telefone,
          });
        }
      } catch {
        setCliente(null);
      }
    })();
    void listar();
  }, [clienteId, listar]);

  useEffect(() => {
    setPagina(1);
  }, [clienteId]);

  useEffect(() => {
    if (!mensagemSucesso) return;
    const t = setTimeout(() => setMensagemSucesso(null), 4000);
    return () => clearTimeout(t);
  }, [mensagemSucesso]);

  function descontoNormalizado(valorDigitado: string, saldo: number): number {
    const descontoLido = parseValorReais(valorDigitado);
    if (!Number.isFinite(descontoLido) || descontoLido <= 0) return 0;
    if (descontoLido >= saldo) return saldo;
    return descontoLido;
  }

  function abrirModalPagamento(i: Inadimplencia, tipo: "total" | "parcial" = "total") {
    setModalPagamento({
      tipo,
      inadimplencia: i,
      nomeCliente,
      descontoDigitado: "",
      valorParcialDigitado: "",
      metodoPagamento: tipo === "parcial" ? "PIX" : "",
      observacao: "",
      dataPagamento: new Date().toISOString().slice(0, 10),
    });
  }

  async function salvarPagamentoModal() {
    if (!modalPagamento) return;
    const i = modalPagamento.inadimplencia;
    if (!i.id) {
      setErro("Não foi possível registrar: ID da inadimplência ausente.");
      return;
    }

    if (modalPagamento.tipo === "total" && !modalPagamento.metodoPagamento.trim()) {
      setErro("Método de pagamento é obrigatório.");
      return;
    }

    if (modalPagamento.tipo === "parcial") {
      const saldo = saldoDevedorItem(i);
      const valorReais = parseValorReais(modalPagamento.valorParcialDigitado);
      if (!valorReais || valorReais <= 0) {
        setErro("Informe um valor maior que zero para o pagamento parcial.");
        return;
      }
      if (valorReais > saldo) {
        setErro("Valor não pode ser maior que o saldo devedor.");
        return;
      }
    }

    setSalvandoPagamento(true);
    setErro(null);

    try {
      if (modalPagamento.tipo === "total") {
        const saldo = saldoDevedorItem(i);
        const desconto = descontoNormalizado(modalPagamento.descontoDigitado, saldo);
        const metodoPagamento = modalPagamento.metodoPagamento.trim();
        const observacao = modalPagamento.observacao.trim();
        const dataPagamento = modalPagamento.dataPagamento || new Date().toISOString().slice(0, 10);
        await api.patch(`/api/inadimplentes/${i.id}`, {
          status: "Pago",
          desconto,
          metodoPagamento,
          observacao: observacao || undefined,
          dataPagamento,
        });
        setMensagemSucesso("Pagamento total confirmado com sucesso.");
      } else {
        const valorReais = parseValorReais(modalPagamento.valorParcialDigitado);
        await api.post("/api/pagamentos", {
          dividaId: i.id,
          valorPago: Math.round(valorReais * 100),
          dataPagamento: modalPagamento.dataPagamento || new Date().toISOString().slice(0, 10),
          metodoPagamento: modalPagamento.metodoPagamento || "PIX",
        });
        setMensagemSucesso("Pagamento parcial registrado com sucesso.");
      }
      setModalPagamento(null);
      invalidateDashboard();
      await listar();
    } catch (e: unknown) {
      setErro(
        getApiErrorMessage(
          e,
          modalPagamento.tipo === "total"
            ? "Não foi possível confirmar o pagamento."
            : "Não foi possível registrar o pagamento parcial."
        )
      );
    } finally {
      setSalvandoPagamento(false);
    }
  }

  async function executarCancelamento() {
    if (!inadimplenciaParaCancelar?.item.id) return;
    const id = inadimplenciaParaCancelar.item.id;
    setInadimplenciaParaCancelar(null);
    try {
      setErro(null);
      await api.delete(`/api/inadimplentes/${id}`);
      setMensagemSucesso("Inadimplência cancelada.");
      invalidateDashboard();
      await listar();
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao cancelar inadimplência"));
    }
  }

  async function obterLinkPagamentoStripe(item: Inadimplencia): Promise<string | null> {
    if (isMockEnabled()) return null;
    try {
      const res = await api.post<{ stripePaymentLinkUrl?: string | null }>("/api/notificacoes/enviar-cobranca", {
        clienteId: item.clienteId,
        dividaId: item.id ?? undefined,
        gerarLinkPagamentoStripe: true,
      });
      const rawLink = res.data?.stripePaymentLinkUrl;
      return typeof rawLink === "string" && /^https:\/\//i.test(rawLink.trim()) ? rawLink.trim() : null;
    } catch {
      return null;
    }
  }

  async function enviarCobrancaPorEmail(item: Inadimplencia) {
    setLoadingCobrancaCanal(true);
    setErro(null);
    try {
      const stripePaymentLinkUrl = await obterLinkPagamentoStripe(item);
      const copiou = await copyCobrancaEmailToClipboard(item, nomeCliente, stripePaymentLinkUrl);
      if (copiou) {
        setToastEmailFormatado(true);
        setTimeout(() => setToastEmailFormatado(false), 5000);
      }
      openGmailCompose(buildGmailComposeUrl(item, nomeCliente, cliente?.email, true));
      setModalCobrancaCanal(null);
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao preparar envio por e-mail."));
    } finally {
      setLoadingCobrancaCanal(false);
    }
  }

  async function enviarCobrancaPorWhatsApp(item: Inadimplencia) {
    const telefone = cliente?.celular || cliente?.telefone;
    if (!normalizeTelefoneParaWhatsApp(telefone)) {
      setErro("Cadastre o celular ou telefone do cliente para abrir o WhatsApp com o contato correto.");
      return;
    }
    setLoadingCobrancaCanal(true);
    setErro(null);
    try {
      const stripePaymentLinkUrl = await obterLinkPagamentoStripe(item);
      const url = buildWhatsAppCobrancaUrl(item, nomeCliente, telefone, stripePaymentLinkUrl);
      openWhatsAppCobranca(url);
      setModalCobrancaCanal(null);
      setMensagemSucesso("WhatsApp aberto com a mensagem de cobrança.");
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao abrir o WhatsApp."));
    } finally {
      setLoadingCobrancaCanal(false);
    }
  }

  const totalEmAberto = itens.reduce((s, i) => s + saldoDevedorItem(i), 0);
  const maiorAtraso = itens.reduce((max, i) => Math.max(max, diasEmAtraso(i.vencimento)), 0);
  const totalPaginasHonorarios = Math.max(1, Math.ceil(itens.length / itensPorPagina));
  const paginaAtualHonorarios = Math.min(pagina, totalPaginasHonorarios);
  const itensPaginaHonorarios = itens.slice(
    (paginaAtualHonorarios - 1) * itensPorPagina,
    paginaAtualHonorarios * itensPorPagina
  );

  useEffect(() => {
    if (pagina > totalPaginasHonorarios && totalPaginasHonorarios >= 1) setPagina(1);
  }, [itens.length, totalPaginasHonorarios, pagina]);

  if (!clienteId) {
    return (
      <div className="page-inadimplentes page-inadimplentes--honorarios">
        <p className="page-inadimplentes__erro">Cliente não informado.</p>
        <Link to="/inadimplentes" className="page-inadimplentes-honorarios__voltar-link">
          Voltar para a lista
        </Link>
      </div>
    );
  }

  return (
    <div className="page-inadimplentes page-inadimplentes--honorarios">
      <Link to="/inadimplentes" className="page-inadimplentes-honorarios__voltar">
        <ArrowLeftIcon />
        Voltar para inadimplentes
      </Link>

      <p className="page-inadimplentes__contexto">Sistema de Gestão de Inadimplentes</p>

      <header className="page-inadimplentes-honorarios__header">
        <div>
          <h1 className="page-inadimplentes__title">Honorários em aberto</h1>
          <p className="page-inadimplentes-honorarios__cliente-nome">{nomeCliente}</p>
        </div>
        {(cliente?.email || cliente?.cpf) && (
          <div className="page-inadimplentes-honorarios__cliente-meta">
            {cliente?.cpf && <span>{formatCpfCnpj(cliente.cpf)}</span>}
            {cliente?.email && <span>{cliente.email}</span>}
          </div>
        )}
      </header>

      {mensagemSucesso && <p className="toast toast--sucesso">{mensagemSucesso}</p>}
      {toastEmailFormatado && (
        <p className="toast toast--sucesso">
          E-mail formatado copiado. Cole no corpo da mensagem no Gmail (Ctrl+V) para usar o layout.
        </p>
      )}
      {erro && <p className="page-inadimplentes__erro">{erro}</p>}

      <div className="page-inadimplentes__cards page-inadimplentes-honorarios__cards">
        <div className="page-inadimplentes__card">
          <span className="page-inadimplentes__card-label">Honorários em aberto</span>
          <span className="page-inadimplentes__card-value">{loading ? "—" : itens.length}</span>
        </div>
        <div className="page-inadimplentes__card">
          <span className="page-inadimplentes__card-label">Total em aberto</span>
          <span className="page-inadimplentes__card-value">{loading ? "—" : formatarMoeda(totalEmAberto)}</span>
        </div>
        <div className="page-inadimplentes__card">
          <span className="page-inadimplentes__card-label">Maior atraso</span>
          <span className="page-inadimplentes__card-value">{loading ? "—" : `${maiorAtraso} dias`}</span>
        </div>
      </div>

      <section className="page-inadimplentes-honorarios__secao">
        <h2 className="page-inadimplentes__tabela-titulo">Detalhamento por período</h2>

        {loading ? (
          <p className="page-inadimplentes__loading">Carregando honorários...</p>
        ) : itens.length === 0 ? (
          <div className="page-inadimplentes-honorarios__vazio">
            <p>Nenhum honorário em aberto para este cliente.</p>
            <button type="button" className="btn btn--primary" onClick={() => navigate("/inadimplentes")}>
              Voltar para a lista
            </button>
          </div>
        ) : (
          <>
          <div className="page-inadimplentes-honorarios__grid">
            {itensPaginaHonorarios.map((i) => {
              const key = i.id ?? `${i.vencimento}-${i.valor}`;
              const { valorOriginal, juros, valorTotal } = valoresHonorario(i);
              const pagamentosDoItem = i.pagamentos ?? [];
              const pagamentosFallback = i.id ? historicoPagamentosParciais[i.id] : undefined;
              const listaPagamentos = ordenarPagamentosPorData(
                pagamentosDoItem.length > 0 ? pagamentosDoItem : (pagamentosFallback ?? [])
              );
              const loadingHist = Boolean(i.id && loadingHistoricoPagamentosParciais[i.id]);
              const atraso = diasEmAtraso(i.vencimento);

              return (
                <article key={key} className="page-inadimplentes-honorarios__card">
                  <div className="page-inadimplentes-honorarios__card-topo">
                    <div className="page-inadimplentes-honorarios__card-topo-linha">
                      <span className="page-inadimplentes-honorarios__periodo">{formatarMesAno(i.vencimento)}</span>
                      <span className={`page-inadimplentes-honorarios__atraso${atraso > 0 ? " page-inadimplentes-honorarios__atraso--alerta" : ""}`}>
                        {atraso > 0 ? `${atraso} dias em atraso` : "No prazo"}
                      </span>
                    </div>
                    <span className="page-inadimplentes-honorarios__vencimento">
                      Vencimento: {formatarData(i.vencimento)}
                    </span>
                  </div>

                  <div className="page-inadimplentes-honorarios__valores">
                    <div className="page-inadimplentes-honorarios__valor-item">
                      <span>Original</span>
                      <strong>{formatarMoeda(valorOriginal)}</strong>
                    </div>
                    <div className="page-inadimplentes-honorarios__valor-item">
                      <span>Juros</span>
                      <strong>{formatarMoeda(juros)}</strong>
                    </div>
                    <div className="page-inadimplentes-honorarios__valor-item page-inadimplentes-honorarios__valor-item--destaque">
                      <span>Total</span>
                      <strong>{formatarMoeda(valorTotal)}</strong>
                    </div>
                  </div>

                  <div className="page-inadimplentes__acoes-detalhe page-inadimplentes-honorarios__acoes">
                    <button
                      type="button"
                      className="page-inadimplentes__btn-icone page-inadimplentes__btn-icone--confirmar"
                      onClick={() => i.id != null && abrirModalPagamento(i)}
                      disabled={i.id == null || valorTotal <= 0}
                      title="Registrar pagamento (total ou parcial)"
                      aria-label="Registrar pagamento total ou parcial"
                    >
                      <CheckIcon />
                    </button>
                    <button
                      type="button"
                      className="page-inadimplentes__btn-icone page-inadimplentes__btn-icone--email"
                      onClick={() => setModalCobrancaCanal({ inadimplencia: i })}
                      title="Enviar cobrança (e-mail ou WhatsApp)"
                      aria-label="Enviar cobrança por e-mail ou WhatsApp"
                    >
                      <EmailSendIcon />
                    </button>
                    <button
                      type="button"
                      className="page-inadimplentes__btn-icone page-inadimplentes__btn-icone--cancelar"
                      onClick={() => setInadimplenciaParaCancelar({ item: i, nomeCliente })}
                      disabled={i.id == null}
                      title="Cancelar inadimplência"
                      aria-label="Cancelar inadimplência"
                    >
                      <CancelIcon />
                    </button>
                  </div>

                  <div className="page-inadimplentes-honorarios__pagamentos">
                    <h3 className="page-inadimplentes-honorarios__pagamentos-titulo">Pagamentos registrados</h3>
                    {!i.id ? (
                      <p className="page-inadimplentes-honorarios__pagamentos-vazio">Dívida sem ID — histórico indisponível.</p>
                    ) : loadingHist && listaPagamentos.length === 0 ? (
                      <p className="page-inadimplentes-honorarios__pagamentos-vazio">Carregando pagamentos...</p>
                    ) : listaPagamentos.length === 0 ? (
                      <p className="page-inadimplentes-honorarios__pagamentos-vazio">Nenhum pagamento parcial registrado.</p>
                    ) : (
                      <table className="page-inadimplentes__tabela page-inadimplentes__tabela--detalhe page-inadimplentes-honorarios__pagamentos-tabela">
                        <thead>
                          <tr>
                            <th>Data</th>
                            <th className="page-inadimplentes__cell-num">Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {listaPagamentos.map((p) => (
                            <tr key={p.pagamentoId ?? `${p.dataPagamento}-${p.valorPago}`}>
                              <td>{formatarData(p.dataPagamento)}</td>
                              <td className="page-inadimplentes__cell-num">{formatarMoeda(p.valorPago)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          {itens.length > itensPorPagina && (
            <div className="page-inadimplentes__paginacao page-inadimplentes-honorarios__paginacao">
              <button
                type="button"
                className="btn btn--secondary btn--small"
                disabled={paginaAtualHonorarios <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
              >
                Anterior
              </button>
              <span className="page-inadimplentes__paginacao-info">
                Página {paginaAtualHonorarios} de {totalPaginasHonorarios} ({itens.length} honorário{itens.length !== 1 ? "s" : ""})
              </span>
              <button
                type="button"
                className="btn btn--secondary btn--small"
                disabled={paginaAtualHonorarios >= totalPaginasHonorarios}
                onClick={() => setPagina((p) => Math.min(totalPaginasHonorarios, p + 1))}
              >
                Próxima
              </button>
            </div>
          )}
          </>
        )}

        {!loading && itens.length > 0 && (
          <p className="page-inadimplentes-honorarios__total-geral">
            Total geral em aberto: <strong>{formatarMoeda(totalEmAberto)}</strong>
          </p>
        )}
      </section>

      {modalCobrancaCanal && (
        <div className="modal-overlay" onClick={() => !loadingCobrancaCanal && setModalCobrancaCanal(null)}>
          <div className="modal modal--cadastro modal--pagamento" onClick={(e) => e.stopPropagation()}>
            <p className="modal__eyebrow">ENVIAR COBRANÇA</p>
            <h2 className="modal__titulo">{nomeCliente}</h2>
            <p className="modal__texto-confirmacao modal__label--full">
              Mês: <strong>{formatarMesAno(modalCobrancaCanal.inadimplencia.vencimento)}</strong>{" "}
              Vencimento: <strong>{formatarData(modalCobrancaCanal.inadimplencia.vencimento)}</strong>
            </p>
            <p className="modal-cobranca-canal__pergunta">Como deseja enviar a cobrança?</p>
            <div className="modal-pagamento__tipo-tabs modal-cobranca-canal__opcoes">
              <button
                type="button"
                className="modal-pagamento__tipo-tab"
                onClick={() => void enviarCobrancaPorEmail(modalCobrancaCanal.inadimplencia)}
                disabled={loadingCobrancaCanal}
              >
                <span className="modal-pagamento__tipo-icone modal-pagamento__tipo-icone--email">
                  <EmailSendIcon />
                </span>
                <span className="modal-pagamento__tipo-texto">
                  <strong>E-mail</strong>
                  <small>
                    {cliente?.email
                      ? `Abre o Gmail para ${cliente.email}`
                      : "Abre o Gmail (informe o destinatário)"}
                  </small>
                </span>
              </button>
              <button
                type="button"
                className="modal-pagamento__tipo-tab"
                onClick={() => void enviarCobrancaPorWhatsApp(modalCobrancaCanal.inadimplencia)}
                disabled={loadingCobrancaCanal || !normalizeTelefoneParaWhatsApp(cliente?.celular || cliente?.telefone)}
                title={
                  !normalizeTelefoneParaWhatsApp(cliente?.celular || cliente?.telefone)
                    ? "Cadastre celular ou telefone do cliente"
                    : undefined
                }
              >
                <span className="modal-pagamento__tipo-icone modal-pagamento__tipo-icone--whatsapp">
                  <WhatsAppIcon />
                </span>
                <span className="modal-pagamento__tipo-texto">
                  <strong>WhatsApp</strong>
                  <small>
                    {normalizeTelefoneParaWhatsApp(cliente?.celular || cliente?.telefone)
                      ? `Abre conversa com ${cliente?.celular || cliente?.telefone}`
                      : "Cliente sem telefone cadastrado"}
                  </small>
                </span>
              </button>
            </div>
            {loadingCobrancaCanal && <p className="modal-cobranca-canal__loading">Preparando envio…</p>}
            <div className="modal__botoes">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setModalCobrancaCanal(null)}
                disabled={loadingCobrancaCanal}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

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
              <button type="button" className="btn btn--danger" onClick={() => void executarCancelamento()}>
                Apagar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalPagamento && (
        <div className="modal-overlay" onClick={() => !salvandoPagamento && setModalPagamento(null)}>
          <div className="modal modal--cadastro modal--pagamento" onClick={(e) => e.stopPropagation()}>
            <p className="modal__eyebrow">REGISTRAR PAGAMENTO</p>
            <h2 className="modal__titulo">{modalPagamento.nomeCliente}</h2>
            <p className="modal__texto-confirmacao modal__label--full">
              Mês: <strong>{formatarMesAno(modalPagamento.inadimplencia.vencimento)}</strong>{" "}
              Vencimento: <strong>{formatarData(modalPagamento.inadimplencia.vencimento)}</strong>
            </p>

            <div className="modal-pagamento__tipo-tabs" role="tablist" aria-label="Tipo de pagamento">
              <button
                type="button"
                role="tab"
                aria-selected={modalPagamento.tipo === "total"}
                className={`modal-pagamento__tipo-tab${modalPagamento.tipo === "total" ? " modal-pagamento__tipo-tab--ativo" : ""}`}
                onClick={() =>
                  setModalPagamento((prev) =>
                    prev ? { ...prev, tipo: "total", metodoPagamento: prev.metodoPagamento || "" } : prev
                  )
                }
                disabled={salvandoPagamento}
              >
                <span className="modal-pagamento__tipo-icone modal-pagamento__tipo-icone--total">
                  <CheckIcon />
                </span>
                <span className="modal-pagamento__tipo-texto">
                  <strong>Pagamento total</strong>
                  <small>Quita a dívida por completo</small>
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={modalPagamento.tipo === "parcial"}
                className={`modal-pagamento__tipo-tab${modalPagamento.tipo === "parcial" ? " modal-pagamento__tipo-tab--ativo" : ""}`}
                onClick={() =>
                  setModalPagamento((prev) =>
                    prev ? { ...prev, tipo: "parcial", metodoPagamento: prev.metodoPagamento || "PIX" } : prev
                  )
                }
                disabled={salvandoPagamento}
              >
                <span className="modal-pagamento__tipo-icone modal-pagamento__tipo-icone--parcial">R$</span>
                <span className="modal-pagamento__tipo-texto">
                  <strong>Pagamento parcial</strong>
                  <small>Registra apenas parte do valor</small>
                </span>
              </button>
            </div>

            <div className="modal__grid">
              {(() => {
                const i = modalPagamento.inadimplencia;
                const saldo = saldoDevedorItem(i);
                const desconto = descontoNormalizado(modalPagamento.descontoDigitado, saldo);
                const { valorOriginal, juros } = valoresHonorario(i);
                const valorParcial = parseValorReais(modalPagamento.valorParcialDigitado);
                return (
                  <>
                    <div className="modal__campo-inline modal__input--full modal__resumo-item">
                      <span>Valor original</span>
                      <strong>{formatarMoeda(valorOriginal)}</strong>
                    </div>
                    <div className="modal__campo-inline modal__input--full modal__resumo-item">
                      <span>Juros</span>
                      <strong>{formatarMoeda(juros)}</strong>
                    </div>
                    <div className="modal__campo-inline modal__input--full modal__resumo-item modal__resumo-item--destaque">
                      <span>Saldo devedor</span>
                      <strong>{formatarMoeda(saldo)}</strong>
                    </div>

                    {modalPagamento.tipo === "total" ? (
                      <>
                        <div className="modal__linha-dois-campos">
                          <div className="modal__campo-stack">
                            <label className="modal__label">Desconto (R$)</label>
                            <input
                              placeholder="0,00"
                              value={modalPagamento.descontoDigitado}
                              onChange={(e) =>
                                setModalPagamento((prev) => (prev ? { ...prev, descontoDigitado: e.target.value } : prev))
                              }
                              className="modal__input"
                              disabled={salvandoPagamento}
                            />
                          </div>
                          <div className="modal__campo-stack">
                            <label className="modal__label modal__label--required">Método de pagamento</label>
                            <select
                              value={modalPagamento.metodoPagamento}
                              onChange={(e) =>
                                setModalPagamento((prev) => (prev ? { ...prev, metodoPagamento: e.target.value } : prev))
                              }
                              className="modal__input modal__select"
                              disabled={salvandoPagamento}
                            >
                              <option value="">Selecione</option>
                              <option value="PIX">PIX</option>
                              <option value="Dinheiro">Dinheiro</option>
                              <option value="Cartão">Cartão</option>
                              <option value="Transferência">Transferência</option>
                            </select>
                          </div>
                        </div>
                        <div className="modal__campo-inline modal__input--full modal__resumo-item modal__resumo-item--destaque">
                          <span>Total a receber após desconto</span>
                          <strong>{formatarMoeda(Math.max(0, saldo - desconto))}</strong>
                        </div>
                        <label className="modal__label modal__label--full">Data do pagamento</label>
                        <input
                          type="date"
                          value={modalPagamento.dataPagamento}
                          onChange={(e) =>
                            setModalPagamento((prev) => (prev ? { ...prev, dataPagamento: e.target.value } : prev))
                          }
                          className="modal__input modal__input--full"
                          disabled={salvandoPagamento}
                        />
                        <label className="modal__label modal__label--full">Observação</label>
                        <textarea
                          placeholder="Opcional"
                          value={modalPagamento.observacao}
                          onChange={(e) =>
                            setModalPagamento((prev) => (prev ? { ...prev, observacao: e.target.value } : prev))
                          }
                          className="modal__input modal__input--full"
                          rows={3}
                          disabled={salvandoPagamento}
                        />
                      </>
                    ) : (
                      <>
                        <label className="modal__label modal__label--required">Valor a pagar agora</label>
                        <input
                          placeholder="0,00"
                          value={modalPagamento.valorParcialDigitado}
                          onChange={(e) =>
                            setModalPagamento((prev) => (prev ? { ...prev, valorParcialDigitado: e.target.value } : prev))
                          }
                          className="modal__input"
                          disabled={salvandoPagamento}
                        />
                        {valorParcial > 0 && (
                          <div className="modal__campo-inline modal__input--full modal__resumo-item">
                            <span>Saldo restante após pagamento</span>
                            <strong>{formatarMoeda(Math.max(0, saldo - valorParcial))}</strong>
                          </div>
                        )}
                        <label className="modal__label">Data do pagamento</label>
                        <input
                          type="date"
                          value={modalPagamento.dataPagamento}
                          onChange={(e) =>
                            setModalPagamento((prev) => (prev ? { ...prev, dataPagamento: e.target.value } : prev))
                          }
                          className="modal__input"
                          disabled={salvandoPagamento}
                        />
                        <label className="modal__label">Método de pagamento</label>
                        <select
                          value={modalPagamento.metodoPagamento}
                          onChange={(e) =>
                            setModalPagamento((prev) => (prev ? { ...prev, metodoPagamento: e.target.value } : prev))
                          }
                          className="modal__input modal__select"
                          disabled={salvandoPagamento}
                        >
                          <option value="PIX">PIX</option>
                          <option value="Dinheiro">Dinheiro</option>
                          <option value="Cartão">Cartão</option>
                          <option value="Transferência">Transferência</option>
                        </select>
                      </>
                    )}
                  </>
                );
              })()}
            </div>
            <div className="modal__botoes modal__botoes--duplo">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setModalPagamento(null)}
                disabled={salvandoPagamento}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => void salvarPagamentoModal()}
                disabled={
                  salvandoPagamento ||
                  (modalPagamento.tipo === "total" && !modalPagamento.metodoPagamento.trim())
                }
              >
                {salvandoPagamento
                  ? "Salvando..."
                  : modalPagamento.tipo === "total"
                    ? "Confirmar pagamento total"
                    : "Registrar pagamento parcial"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
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

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
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
