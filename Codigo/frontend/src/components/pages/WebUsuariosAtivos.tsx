import { useCallback, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { api, getApiErrorMessage, normalizeListResponse, USER_LOGIN_KEY } from "@/lib/api";
import type { UsuarioAtivo } from "@/types/api";

function formatarData(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

function labelPerfil(perfil: string): string {
  if (perfil === "PROPRIETARIA") return "Proprietária";
  if (perfil === "RESPONSAVEL_FINANCEIRO") return "Responsável financeiro";
  return perfil;
}

type WebUsuariosAtivosProps = {
  /** Quando true, omite título e intro (usado na página unificada Usuários) */
  embedded?: boolean;
};

export default function WebUsuariosAtivos({ embedded = false }: WebUsuariosAtivosProps) {
  const navigate = useNavigate();
  const [itens, setItens] = useState<UsuarioAtivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [revogandoId, setRevogandoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<UsuarioAtivo | null>(null);
  const meuLogin = typeof localStorage !== "undefined" ? localStorage.getItem(USER_LOGIN_KEY) : null;

  const listar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await api.get<UsuarioAtivo[] | unknown>("/api/usuarios/ativos");
      const lista = normalizeListResponse<UsuarioAtivo>(res.data);
      setItens(lista);
    } catch (e: unknown) {
      if (isAxiosError(e) && e.response?.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      setErro(getApiErrorMessage(e, "Não foi possível carregar os usuários ativos."));
      setItens([]);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    listar();
  }, [listar]);

  useEffect(() => {
    if (!mensagemSucesso) return;
    const t = setTimeout(() => setMensagemSucesso(null), 3500);
    return () => clearTimeout(t);
  }, [mensagemSucesso]);

  function podeExibirRevogar(u: UsuarioAtivo): boolean {
    if (meuLogin && u.login.toLowerCase() === meuLogin.toLowerCase()) return false;
    return true;
  }

  async function revogar(usuarioId: string) {
    if (!usuarioId || revogandoId) return;
    setRevogandoId(usuarioId);
    setErro(null);
    try {
      await api.patch(`/api/usuarios/${usuarioId}/revogar`, {});
      setMensagemSucesso("Acesso revogado com sucesso.");
      setConfirmar(null);
      await listar();
    } catch (e: unknown) {
      if (isAxiosError(e) && e.response?.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      const status = isAxiosError(e) ? e.response?.status : undefined;
      if (status === 403) {
        setErro(
          getApiErrorMessage(
            e,
            "Você não tem permissão para essa ação, ou o usuário não pode ser revogado."
          )
        );
        return;
      }
      setErro(getApiErrorMessage(e, "Não foi possível revogar o acesso."));
    } finally {
      setRevogandoId(null);
    }
  }

  return (
    <div
      className={
        embedded
          ? "page-cadastros-pendentes page-usuarios-ativos page-usuarios__subpagina"
          : "page-cadastros-pendentes page-usuarios-ativos"
      }
    >
      {!embedded && (
        <>
          <h1 className="page-cadastros-pendentes__title">Contas ativas</h1>
          <p className="page-usuarios-ativos__intro">
            Usuários com acesso ao sistema. Revogar o acesso impede novos logins.
          </p>
        </>
      )}

      {erro && <p className="page-cadastros-pendentes__erro">{erro}</p>}
      {mensagemSucesso && <p className="toast toast--sucesso">{mensagemSucesso}</p>}

      <section className="page-inadimplentes__tabela-secao">
        <div className="page-inadimplentes__tabela-wrap">
          <table className="page-inadimplentes__tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Telefone / Login</th>
                <th>Perfil</th>
                <th>Data de cadastro</th>
                <th className="page-cadastros-pendentes__acao" scope="col">
                  <span className="page-cadastros-pendentes__acao-inner">Ação</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="page-inadimplentes__vazio">
                    Carregando…
                  </td>
                </tr>
              ) : itens.length === 0 ? (
                <tr>
                  <td colSpan={5} className="page-inadimplentes__vazio">
                    Nenhum usuário ativo no momento
                  </td>
                </tr>
              ) : (
                itens.map((u) => {
                  const mostrarRevogar = podeExibirRevogar(u);
                  const disabled = revogandoId === u.usuarioId;
                  return (
                    <tr key={u.usuarioId}>
                      <td>{u.nome}</td>
                      <td>
                        <span className="page-usuarios-ativos__tel">{u.telefone?.trim() || "—"}</span>
                        <span className="page-usuarios-ativos__sep" aria-hidden>
                          {" "}
                          /{" "}
                        </span>
                        <span className="page-usuarios-ativos__login">{u.login}</span>
                      </td>
                      <td>{labelPerfil(String(u.perfil))}</td>
                      <td>{formatarData(u.criadoEm)}</td>
                      <td className="page-cadastros-pendentes__acao">
                        <div className="page-cadastros-pendentes__acao-inner">
                          {mostrarRevogar ? (
                            <button
                              type="button"
                              className="btn btn--danger btn--small"
                              disabled={disabled || !!revogandoId}
                              onClick={() => setConfirmar(u)}
                              title="Revoga o acesso deste usuário. Ele não poderá mais fazer login no sistema."
                              aria-label={`Revogar acesso de ${u.nome} (${u.login})`}
                            >
                              {disabled ? "Revogando…" : "Revogar"}
                            </button>
                          ) : (
                            <span
                              className="page-usuarios-ativos__nao-revogar"
                              title="Você não pode revogar o próprio acesso."
                            >
                              —
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {confirmar && (
        <div className="modal-overlay" onClick={() => !revogandoId && setConfirmar(null)} role="presentation">
          <div className="modal modal--confirmar-exclusao" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-revogar-titulo">
            <h2 className="modal__titulo" id="modal-revogar-titulo">
              Revogar acesso?
            </h2>
            <p className="modal__texto-confirmacao">
              Deseja revogar o acesso deste usuário? Ele não poderá mais entrar no sistema.
            </p>
            <p className="modal__texto-confirmacao page-usuarios-ativos__modal-ident">
              <strong>{confirmar.nome}</strong> — {confirmar.login}
            </p>
            <div className="modal__botoes modal__botoes--duplo">
              <button type="button" className="btn btn--secondary" disabled={!!revogandoId} onClick={() => setConfirmar(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--danger"
                disabled={!!revogandoId}
                onClick={() => revogar(confirmar.usuarioId)}
              >
                {revogandoId ? "Revogando…" : "Revogar acesso"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
