import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api, getApiErrorMessage, isMockEnabled, normalizeListResponse } from "@/lib/api";
import { formatarReaisParaInput, parseValorReais } from "@/lib/valorBrasil";
import { gerarHtmlRelatorioServicos } from "@/lib/relatorioServicos";

type Servico = {
  id: string;
  titulo: string;
  descricao?: string;
  ativo?: boolean;
  valorPadrao?: number | null;
};

const STORAGE_KEY = "sgi_servicos";

function carregarServicosLocal(): Servico[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((s) => ({
      id: String((s as Servico).id ?? crypto.randomUUID?.() ?? String(Date.now())),
      titulo: String((s as Servico).titulo ?? ""),
      descricao: (s as Servico).descricao ? String((s as Servico).descricao) : undefined,
      ativo: true,
      valorPadrao: typeof (s as Servico).valorPadrao === "number" ? (s as Servico).valorPadrao : null,
    }));
  } catch {
    return [];
  }
}

function salvarServicosLocal(servicos: Servico[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(servicos));
}

const RELATORIO_SERVICOS_CSS = `
  body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
  .relatorio-servicos__titulo { text-align: center; font-size: 1.1rem; margin: 0 0 4px; }
  .relatorio-servicos__subtitulo { text-align: center; text-decoration: underline; font-size: 1rem; margin: 0 0 24px; }
  .relatorio-servicos__tabela { width: 100%; border-collapse: collapse; }
  .relatorio-servicos__tabela td { padding: 4px 8px 4px 0; vertical-align: bottom; }
  .relatorio-servicos__tabela .nome { width: 1%; white-space: nowrap; }
  .relatorio-servicos__tabela .traco { width: 100%; border-bottom: 1px dashed #333; }
  .relatorio-servicos__tabela .valor { width: 1%; white-space: nowrap; text-align: right; }
  @media print { body { padding: 16px; } }
`;

/** Abre janela com relatório "Valores a serem cobrados..." e aciona impressão. */
function imprimirRelatorioServicos(servicos: { titulo: string; valorPadrao?: number | null }[]) {
  const hoje = new Date();
  const dataPartir = `01/${String(hoje.getMonth() + 1).padStart(2, "0")}/${hoje.getFullYear()}`;
  const html = gerarHtmlRelatorioServicos(servicos);
  const doc = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Valores - Serviços Prestados</title>
  <style>${RELATORIO_SERVICOS_CSS}</style>
</head>
<body>
  <h1 class="relatorio-servicos__titulo">VALORES A SEREM COBRADOS POR SERVIÇOS PRESTADOS A</h1>
  <p class="relatorio-servicos__subtitulo">PARTIR DE ${dataPartir}</p>
  <div class="relatorio-servicos__conteudo">${html}</div>
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
    return;
  }
  janela.focus();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

const ITENS_POR_PAGINA = 7;

export default function WebServicos() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [erroLista, setErroLista] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Servico | null>(null);
  const [servicoParaExcluir, setServicoParaExcluir] = useState<Servico | null>(null);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function listar() {
    if (isMockEnabled()) {
      setServicos(carregarServicosLocal());
      setLoading(false);
      setErroLista(null);
      return;
    }
    try {
      setLoading(true);
      setErroLista(null);
      let r;
      try {
        r = await api.get("/api/servicos/todos");
      } catch (e: unknown) {
        if ((e as { response?: { status?: number } })?.response?.status === 404) {
          r = await api.get("/api/servicos");
        } else {
          throw e;
        }
      }
      const raw = normalizeListResponse<Record<string, unknown>>(r.data);
      const list: Servico[] = raw.map((s) => ({
        id: String(s.servicoId ?? s.id ?? ""),
        titulo: String(s.nome ?? s.titulo ?? ""),
        descricao: s.descricao != null ? String(s.descricao) : undefined,
        ativo: s.ativo !== false,
        valorPadrao: typeof s.valorPadrao === "number" ? s.valorPadrao : null,
      }));
      setServicos(list);
    } catch (e: unknown) {
      setErroLista(getApiErrorMessage(e, "Falha ao carregar serviços"));
      setServicos([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    listar();
  }, []);

  useEffect(() => {
    if (isMockEnabled() && servicos.length >= 0) salvarServicosLocal(servicos);
  }, [servicos]);

  const servicosExibidos = servicos.filter((s) => s.ativo !== false);
  const totalPaginas = Math.max(1, Math.ceil(servicosExibidos.length / ITENS_POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const itensPagina = servicosExibidos.slice(
    (paginaAtual - 1) * ITENS_POR_PAGINA,
    paginaAtual * ITENS_POR_PAGINA
  );

  useEffect(() => {
    if (pagina > totalPaginas && totalPaginas >= 1) setPagina(totalPaginas);
  }, [pagina, totalPaginas]);

  function abrirNovo() {
    setEditando(null);
    setTitulo("");
    setDescricao("");
    setValor("");
    setErro(null);
    setModalAberto(true);
  }

  function abrirEditar(servico: Servico) {
    setEditando(servico);
    setTitulo(servico.titulo);
    setDescricao(servico.descricao ?? "");
    setValor(formatarReaisParaInput(servico.valorPadrao));
    setErro(null);
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setEditando(null);
    setErro(null);
  }

  async function salvar() {
    if (!titulo.trim()) {
      setErro("Nome do serviço é obrigatório.");
      return;
    }
    const valorReais = parseValorReais(valor);
    /** Mock usa reais; API real espera valorPadrao em centavos no POST/PUT */
    const valorParaMock = valorReais > 0 ? valorReais : null;
    const valorParaApi = valorReais > 0 ? Math.round(valorReais * 100) : null;
    if (isMockEnabled()) {
      if (editando) {
        setServicos((lista) =>
          lista.map((s) =>
            s.id === editando.id
              ? { ...s, titulo: titulo.trim(), descricao: descricao.trim() || undefined, valorPadrao: valorParaMock }
              : s
          )
        );
      } else {
        const novo: Servico = {
          id: crypto.randomUUID?.() ?? String(Date.now()),
          titulo: titulo.trim(),
          descricao: descricao.trim() || undefined,
          ativo: true,
          valorPadrao: valorParaMock,
        };
        setServicos((lista) => [...lista, novo]);
      }
      fecharModal();
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const body = {
        nome: titulo.trim(),
        descricao: descricao.trim() || undefined,
        ativo: true,
        ...(valorParaApi != null && { valorPadrao: valorParaApi }),
      };
      if (editando) {
        await api.put(`/api/servicos/${editando.id}`, body);
      } else {
        await api.post("/api/servicos", body);
      }
      fecharModal();
      await listar();
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao salvar serviço"));
    } finally {
      setSalvando(false);
    }
  }

  function abrirConfirmarExclusao(servico: Servico) {
    setServicoParaExcluir(servico);
  }

  async function confirmarExclusao() {
    const servico = servicoParaExcluir;
    setServicoParaExcluir(null);
    if (!servico) return;
    if (isMockEnabled()) {
      setServicos((lista) => lista.filter((s) => s.id !== servico.id));
      return;
    }
    try {
      await api.put(`/api/servicos/${servico.id}`, {
        nome: servico.titulo,
        descricao: servico.descricao ?? undefined,
        ativo: false,
      });
      await listar();
    } catch (e: unknown) {
      setErroLista(getApiErrorMessage(e, "Falha ao excluir serviço"));
    }
  }

  return (
    <div className="page-servicos">
      <div className="page-servicos__header">
        <div>
          <h1 className="page-servicos__title">Serviços do Escritório</h1>
          <p className="page-servicos__subtitle">Cadastre, edite e exclua os serviços oferecidos pelo escritório.</p>
        </div>
        <div className="page-servicos__header-acoes">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => imprimirRelatorioServicos(servicosExibidos)}
            disabled={servicosExibidos.length === 0}
          >
            <DownloadIcon />
            Gerar relatório
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={abrirNovo}
            title="Cadastrar novo serviço no catálogo do escritório"
          >
            <PlusIcon />
            Novo Serviço
          </button>
        </div>
      </div>

      {erroLista && <p className="page-servicos__erro">{erroLista}</p>}

      {loading ? (
        <p className="page-servicos__vazio">Carregando serviços...</p>
      ) : servicosExibidos.length === 0 ? (
        <p className="page-servicos__vazio">Nenhum serviço cadastrado. Clique em &quot;Novo Serviço&quot; para adicionar.</p>
      ) : (
        <div className="page-servicos__tabela-wrap">
          <table className="page-servicos__tabela">
            <thead>
              <tr>
                <th>Serviço</th>
                <th>Valor</th>
                <th className="page-servicos__th-acao">Ação</th>
              </tr>
            </thead>
            <tbody>
              {itensPagina.map((s) => (
                <tr key={s.id}>
                  <td>
                    <span
                      title={[s.titulo, s.descricao].filter(Boolean).join(" — ")}
                    >
                      {s.titulo}
                    </span>
                  </td>
                  <td title={s.valorPadrao != null ? `Valor padrão: R$ ${s.valorPadrao.toFixed(2)}` : undefined}>
                    {s.valorPadrao != null
                      ? s.valorPadrao.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                      : "—"}
                  </td>
                  <td>
                    <div className="page-servicos__acoes">
                      <button
                        type="button"
                        className="page-servicos__acao page-servicos__acao--editar"
                        onClick={() => abrirEditar(s)}
                        title="Editar este serviço"
                        aria-label="Editar este serviço"
                      >
                        <EditIcon />
                      </button>
                      <button
                        type="button"
                        className="page-servicos__acao page-servicos__acao--excluir"
                        onClick={() => abrirConfirmarExclusao(s)}
                        title="Excluir este serviço (desativar)"
                        aria-label="Excluir este serviço"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {servicosExibidos.length > ITENS_POR_PAGINA && (
        <div className="page-servicos__paginacao">
          <button
            type="button"
            className="btn btn--secondary btn--small"
            disabled={paginaAtual <= 1}
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
          >
            Anterior
          </button>
          <span className="page-servicos__paginacao-info">
            Página {paginaAtual} de {totalPaginas} ({servicosExibidos.length} serviço{servicosExibidos.length !== 1 ? "s" : ""})
          </span>
          <button
            type="button"
            className="btn btn--secondary btn--small"
            disabled={paginaAtual >= totalPaginas}
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
          >
            Próxima
          </button>
        </div>
      )}

      {servicoParaExcluir &&
        createPortal(
          <div className="modal-overlay" onClick={() => setServicoParaExcluir(null)}>
            <div className="modal modal--confirmar-exclusao" onClick={(e) => e.stopPropagation()}>
              <h2 className="modal__titulo">Excluir serviço?</h2>
              <p className="modal__texto-confirmacao">
                Tem certeza que deseja excluir o serviço <strong>{servicoParaExcluir.titulo}</strong>? O serviço será desativado e não aparecerá mais na lista.
              </p>
              <div className="modal__botoes">
                <button type="button" className="btn btn--secondary" onClick={() => setServicoParaExcluir(null)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={confirmarExclusao}
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {modalAberto && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal modal--cadastro" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__titulo">{editando ? "Editar Serviço" : "Novo Serviço"}</h2>
            <div className="modal__grid">
              <label className="modal__label modal__label--required">Nome do serviço</label>
              <input
                className="modal__input modal__input--full"
                placeholder="Ex.: Consultoria contábil, Abertura de empresa..."
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
              <label className="modal__label">Valor padrão (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                className="modal__input modal__input--full"
                placeholder="Ex.: 200,00 ou 1.000,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
              <label className="modal__label">Descrição</label>
              <textarea
                className="modal__input modal__input--full"
                placeholder="Detalhes do serviço, escopo, observações..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={3}
              />
            </div>
            {erro && <p className="page-servicos__erro">{erro}</p>}
            <div className="modal__botoes">
              <button type="button" className="btn btn--secondary" onClick={fecharModal} disabled={salvando}>
                Cancelar
              </button>
              <button type="button" className="btn btn--primary" onClick={salvar} disabled={salvando}>
                {salvando ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
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

function DownloadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
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
