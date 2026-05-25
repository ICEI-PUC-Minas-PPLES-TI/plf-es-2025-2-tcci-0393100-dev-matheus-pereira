import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api, getApiErrorMessage, isMockEnabled, normalizeListResponse } from "@/lib/api";
import { normalizeClienteFromApi, normalizeClienteToApi } from "@/lib/apiNormalizers";
import { exportarRelatorioClientesExcel } from "@/lib/relatorioClientes";
import type { Cliente } from "@/types/api";

function formatCpf(cpf: string | undefined): string {
  if (!cpf) return "—";
  const n = cpf.replace(/\D/g, "");
  if (n.length === 11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (n.length === 14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return cpf;
}

/** Aplica máscara de CPF (11 dígitos) ou CNPJ (14 dígitos) enquanto digita */
function maskCpfCnpj(value: string): string {
  const n = value.replace(/\D/g, "").slice(0, 14);
  if (n.length <= 11) {
    return n
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return n
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .slice(0, 18);
}

function isValidEmail(email: string): boolean {
  if (!email?.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function formatTelefoneFixo(tel: string | undefined): string {
  if (!tel) return "—";
  const n = tel.replace(/\D/g, "");
  const local = n.length > 8 ? n.slice(-8) : n;
  if (local.length >= 5) return `${local.slice(0, 4)}-${local.slice(4)}`;
  return local || tel;
}

function formatCelular(tel: string | undefined): string {
  if (!tel) return "—";
  const n = tel.replace(/\D/g, "").slice(0, 11);
  if (n.length <= 2) return n ? `(${n}` : tel;
  if (n.length <= 7) return `(${n.slice(0, 2)}) (${n.slice(2)}`;
  return `(${n.slice(0, 2)}) (${n.slice(2, 7)}-${n.slice(7)})`;
}

/** Máscara xxxx-xxxx (8 dígitos) */
function maskTelefoneFixo(value: string): string {
  const n = value.replace(/\D/g, "").slice(0, 8);
  if (n.length <= 4) return n;
  return `${n.slice(0, 4)}-${n.slice(4)}`;
}

/** Máscara (xx) (xxxxx-xxxx) */
function maskCelular(value: string): string {
  const n = value.replace(/\D/g, "").slice(0, 11);
  if (n.length <= 2) return n ? `(${n}` : n;
  if (n.length <= 7) return `(${n.slice(0, 2)}) (${n.slice(2)}`;
  return `(${n.slice(0, 2)}) (${n.slice(2, 7)}-${n.slice(7)})`;
}

export default function WebClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroSituacao, setFiltroSituacao] = useState<"todos" | "ativo" | "inativo">("todos");
  const [modalAberto, setModalAberto] = useState(false);
  const [clienteEmEdicao, setClienteEmEdicao] = useState<Cliente | null>(null);
  const [clienteParaExcluir, setClienteParaExcluir] = useState<Cliente | null>(null);
  const [ordenarPor, setOrdenarPor] = useState<"nome" | "cpf" | null>(null);
  const [ordemAsc, setOrdemAsc] = useState(true);
  const [pagina, setPagina] = useState(1);
  const itensPorPagina = 10;
  const buscaDebounceRef = useRef(false);

  const [form, setForm] = useState<Cliente>({
    nome: "",
    email: "",
    cpf: "",
    telefone: "",
    celular: "",
    endereco: "",
    situacao: "Ativo",
  });

  /* Trava o scroll da página enquanto um modal estiver aberto */
  useEffect(() => {
    if (modalAberto || clienteParaExcluir) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalAberto, clienteParaExcluir]);

  useEffect(() => {
    if (!mensagemSucesso) return;
    const t = setTimeout(() => setMensagemSucesso(null), 4000);
    return () => clearTimeout(t);
  }, [mensagemSucesso]);

  async function listar(termoBusca?: string) {
    try {
      setLoading(true);
      setErro(null);
      const params: { page: number; size: number; nome?: string } = { page: 0, size: 100 };
      const termo = termoBusca?.trim();
      if (termo) params.nome = termo;
      const r = await api.get("/api/clientes", { params });
      const list = normalizeListResponse<Record<string, unknown>>(r.data);
      setClientes(list.map((c) => normalizeClienteFromApi(c)));
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao buscar clientes"));
    } finally {
      setLoading(false);
    }
  }

  async function criar() {
    if (!form.nome?.trim()) return setErro("Nome é obrigatório");
    if (!isValidEmail(form.email ?? "")) return setErro("E-mail inválido.");
    setErro(null);
    try {
      const payload = isMockEnabled()
        ? { ...form, cpf: form.cpf?.replace(/\D/g, "") || undefined, telefone: form.telefone?.replace(/\D/g, "") || undefined, celular: form.celular?.replace(/\D/g, "") || undefined }
        : normalizeClienteToApi(form);
      const r = await api.post("/api/clientes", payload);
      const raw = r?.data && typeof r.data === "object" ? r.data : {};
      const novoCliente = normalizeClienteFromApi(raw as Record<string, unknown>);
      setClientes((prev) => [novoCliente, ...prev.filter((c) => c.id !== novoCliente.id)]);
      setForm({ nome: "", email: "", cpf: "", telefone: "", celular: "", endereco: "", situacao: "Ativo" });
      setModalAberto(false);
      setClienteEmEdicao(null);
      setMensagemSucesso("Cliente cadastrado com sucesso.");
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao criar cliente"));
    }
  }

  function abrirModalNovo() {
    setClienteEmEdicao(null);
    setForm({ nome: "", email: "", cpf: "", telefone: "", celular: "", endereco: "", situacao: "Ativo" });
    setModalAberto(true);
  }

  function abrirModalEditar(c: Cliente) {
    setClienteEmEdicao(c);
    setForm({
      ...c,
      nome: c.nome,
      email: c.email ?? "",
      cpf: formatCpf(c.cpf) === "—" ? "" : formatCpf(c.cpf),
      telefone: formatTelefoneFixo(c.telefone) === "—" ? "" : formatTelefoneFixo(c.telefone),
      celular: formatCelular(c.celular) === "—" ? "" : formatCelular(c.celular),
      endereco: c.endereco ?? "",
      situacao: c.situacao ?? "Ativo",
    });
    setModalAberto(true);
  }

  async function atualizar() {
    if (!clienteEmEdicao?.id) return;
    if (!form.nome?.trim()) return setErro("Nome é obrigatório");
    if (!isValidEmail(form.email ?? "")) return setErro("E-mail inválido.");
    setErro(null);
    try {
      const payload = isMockEnabled()
        ? { ...form, id: clienteEmEdicao.id, cpf: form.cpf?.replace(/\D/g, "") || undefined, telefone: form.telefone?.replace(/\D/g, "") || undefined, celular: form.celular?.replace(/\D/g, "") || undefined }
        : normalizeClienteToApi({ ...form, id: clienteEmEdicao.id });
      await api.patch(`/api/clientes/${clienteEmEdicao.id}`, payload);
      setForm({ nome: "", email: "", cpf: "", telefone: "", celular: "", endereco: "", situacao: "Ativo" });
      setModalAberto(false);
      setClienteEmEdicao(null);
      setMensagemSucesso("Cliente atualizado com sucesso.");
      await listar();
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao atualizar cliente"));
    }
  }

  async function excluir(c: Cliente) {
    if (c.id == null) return;
    try {
      setErro(null);
      await api.delete(`/api/clientes/${c.id}`);
      setClienteParaExcluir(null);
      setMensagemSucesso("Cliente excluído com sucesso.");
      await listar();
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao excluir cliente"));
    }
  }

  useEffect(() => {
    listar();
  }, []);

  /* Busca por nome: envia termo ao backend após parar de digitar (debounce 400ms) */
  useEffect(() => {
    if (!buscaDebounceRef.current) {
      buscaDebounceRef.current = true;
      return;
    }
    const termo = busca.trim();
    const t = setTimeout(() => {
      listar(termo || undefined);
      setPagina(1);
    }, 400);
    return () => clearTimeout(t);
  }, [busca]);

  const filtrados = clientes.filter((c) => {
    const matchBusca =
      !busca.trim() ||
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (c.cpf && c.cpf.replace(/\D/g, "").includes(busca.replace(/\D/g, "")));
    const situacao = c.situacao ?? "Ativo";
    const matchSituacao =
      filtroSituacao === "todos" ||
      (filtroSituacao === "ativo" && situacao !== "Inativo") ||
      (filtroSituacao === "inativo" && situacao === "Inativo");
    return matchBusca && matchSituacao;
  });

  const ordenados = [...filtrados].sort((a, b) => {
    if (!ordenarPor) return 0;
    const mul = ordemAsc ? 1 : -1;
    if (ordenarPor === "nome") return mul * (a.nome.localeCompare(b.nome) || 0);
    if (ordenarPor === "cpf") return mul * ((a.cpf || "").localeCompare(b.cpf || ""));
    return 0;
  });

  const totalPaginas = Math.max(1, Math.ceil(ordenados.length / itensPorPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const itensPagina = ordenados.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina);

  useEffect(() => {
    if (pagina > totalPaginas && totalPaginas >= 1) setPagina(1);
  }, [ordenados.length, totalPaginas, pagina]);

  useEffect(() => {
    setPagina(1);
  }, [filtroSituacao]);

  function toggleOrdenacao(campo: "nome" | "cpf") {
    if (ordenarPor === campo) setOrdemAsc((x) => !x);
    else {
      setOrdenarPor(campo);
      setOrdemAsc(true);
    }
  }

  function gerarRelatorioExcel() {
    if (ordenados.length === 0) {
      setErro("Não há clientes para exportar.");
      return;
    }
    setErro(null);
    exportarRelatorioClientesExcel(ordenados, { busca, situacao: filtroSituacao });
    setMensagemSucesso("Relatório exportado. Abra o arquivo no Excel.");
  }

  return (
    <div className="page-clientes">
      <header className="page-clientes__header">
        <h1 className="page-clientes__title">Listagem de Clientes</h1>
        <div className="page-clientes__header-acoes">
          <button
            type="button"
            className="btn btn--primary"
            onClick={gerarRelatorioExcel}
            disabled={loading}
            title="Exportar listagem de clientes para Excel"
          >
            <DownloadIcon />
            Gerar relatório
          </button>
          <button type="button" className="btn btn--primary" onClick={abrirModalNovo}>
            <PlusIcon />
            Novo Cliente
          </button>
        </div>
      </header>

      {mensagemSucesso && <p className="toast toast--sucesso">{mensagemSucesso}</p>}
      {erro && <p className="page-clientes__erro">{erro}</p>}

      <div className="page-clientes__filtros">
        <div className="page-clientes__busca">
          <SearchIcon />
          <input
            type="text"
            placeholder="Buscar clientes..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="page-clientes__input"
          />
        </div>
        <select
          className="page-clientes__filtro-situacao"
          value={filtroSituacao}
          onChange={(e) => setFiltroSituacao(e.target.value as "todos" | "ativo" | "inativo")}
          aria-label="Filtrar por situação"
        >
          <option value="todos">Todos</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
        </select>
      </div>

      <div className="page-clientes__tabela-wrap">
        <table className="page-clientes__tabela">
          <thead>
            <tr>
              <th>
                <button type="button" className="page-clientes__th" onClick={() => toggleOrdenacao("nome")}>
                  Nome <SortIcon />
                </button>
              </th>
              <th>
                <button type="button" className="page-clientes__th" onClick={() => toggleOrdenacao("cpf")}>
                  CPF/CNPJ <SortIcon />
                </button>
              </th>
              <th>Telefone fixo</th>
              <th>Celular</th>
              <th>E-mail</th>
              <th className="page-clientes__th-acao">Ação</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="page-clientes__loading">
                  Carregando...
                </td>
              </tr>
            ) : ordenados.length === 0 ? (
              <tr>
                <td colSpan={6} className="page-clientes__vazio">Nenhum cliente encontrado.</td>
              </tr>
            ) : (
              itensPagina.map((c) => (
                  <tr key={c.id ?? `${c.nome}-${c.cpf ?? ""}`}>
                    <td>{c.nome}</td>
                    <td>{formatCpf(c.cpf)}</td>
                    <td>{formatTelefoneFixo(c.telefone)}</td>
                    <td>{formatCelular(c.celular)}</td>
                    <td>{c.email?.trim() ? c.email : "—"}</td>
                    <td>
                      <div className="page-clientes__acoes">
                        <button
                          type="button"
                          className="page-clientes__acao page-clientes__acao--editar"
                          onClick={() => abrirModalEditar(c)}
                          title="Editar cliente"
                          aria-label="Editar cliente"
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          className="page-clientes__acao page-clientes__acao--excluir"
                          onClick={() => setClienteParaExcluir(c)}
                          title="Excluir cliente"
                          aria-label="Excluir cliente"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      {ordenados.length > itensPorPagina && (
        <div className="page-clientes__paginacao">
          <button
            type="button"
            className="btn btn--secondary btn--small"
            disabled={paginaAtual <= 1}
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
          >
            Anterior
          </button>
          <span className="page-clientes__paginacao-info">
            Página {paginaAtual} de {totalPaginas} ({ordenados.length} cliente{ordenados.length !== 1 ? "s" : ""})
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

      {clienteParaExcluir &&
        createPortal(
          <div className="modal-overlay" onClick={() => setClienteParaExcluir(null)}>
            <div className="modal modal--confirmar-exclusao" onClick={(e) => e.stopPropagation()}>
              <h2 className="modal__titulo">Excluir cliente?</h2>
              <p className="modal__texto-confirmacao">
                Tem certeza que deseja excluir o cliente <strong>{clienteParaExcluir.nome}</strong>? Esta ação não pode ser desfeita.
              </p>
              <div className="modal__botoes">
                <button type="button" className="btn btn--secondary" onClick={() => setClienteParaExcluir(null)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={() => excluir(clienteParaExcluir)}
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {modalAberto &&
        createPortal(
          <div className="modal-overlay" onClick={() => { setModalAberto(false); setClienteEmEdicao(null); }}>
            <div className="modal modal--cadastro" onClick={(e) => e.stopPropagation()}>
              <h2 className="modal__titulo">{clienteEmEdicao ? "Editar Cliente" : "Cadastro de Cliente"}</h2>
              <div className="modal__grid">
                <label className="modal__label modal__label--required">Nome</label>
                <input
                  placeholder="Digite o nome completo"
                  required
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="modal__input"
                />
                <label className="modal__label modal__label--required">CPF/CNPJ</label>
                <input
                  placeholder="000.000.000-00"
                  value={form.cpf ?? ""}
                  onChange={(e) => setForm({ ...form, cpf: maskCpfCnpj(e.target.value) })}
                  className="modal__input"
                  maxLength={18}
                  inputMode="numeric"
                  autoComplete="off"
                />
                <label className="modal__label">Endereço</label>
                <input
                  placeholder="Rua, número, bairro, cidade - UF"
                  value={form.endereco ?? ""}
                  onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                  className="modal__input"
                />
                <label className="modal__label">Telefone fixo</label>
                <input
                  type="tel"
                  placeholder="0000-0000"
                  value={form.telefone ?? ""}
                  onChange={(e) => setForm({ ...form, telefone: maskTelefoneFixo(e.target.value) })}
                  className="modal__input"
                  maxLength={9}
                  inputMode="numeric"
                />
                <label className="modal__label">Celular</label>
                <input
                  type="tel"
                  placeholder="(00) (00000-0000)"
                  value={form.celular ?? ""}
                  onChange={(e) => setForm({ ...form, celular: maskCelular(e.target.value) })}
                  className="modal__input"
                  maxLength={17}
                  inputMode="numeric"
                />
                <label className="modal__label">E-mail</label>
                <input
                  placeholder="email@exemplo.com"
                  type="email"
                  value={form.email ?? ""}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="modal__input"
                  pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
                  title="Informe um e-mail válido (ex: nome@exemplo.com)"
                />
                {clienteEmEdicao && (
                  <>
                    <label className="modal__label">Situação</label>
                    <div className="modal__toggle-wrap page-clientes__toggle-wrap">
                      <span className="page-clientes__toggle-label">
                        {(form.situacao ?? "Ativo") !== "Inativo" ? "Ativo" : "Inativo"}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={(form.situacao ?? "Ativo") !== "Inativo"}
                        aria-label={
                          (form.situacao ?? "Ativo") !== "Inativo"
                            ? "Ativo - clicar para desativar"
                            : "Inativo - clicar para ativar"
                        }
                        className={`page-clientes__toggle ${(form.situacao ?? "Ativo") !== "Inativo" ? "page-clientes__toggle--on" : ""}`}
                        onClick={() =>
                          setForm({
                            ...form,
                            situacao: (form.situacao ?? "Ativo") !== "Inativo" ? "Inativo" : "Ativo",
                          })
                        }
                      >
                        <span className="page-clientes__toggle-thumb" />
                      </button>
                    </div>
                  </>
                )}
              </div>
              <div className="modal__botoes">
                <button type="button" className="btn btn--secondary" onClick={() => { setModalAberto(false); setClienteEmEdicao(null); }}>
                  Cancelar
                </button>
                <button type="button" className="btn btn--primary" onClick={clienteEmEdicao ? atualizar : criar}>
                  Salvar
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

function DownloadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
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
