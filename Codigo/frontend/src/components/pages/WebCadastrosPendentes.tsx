import { useCallback, useEffect, useState } from "react";
import type { AxiosError } from "axios";
import { api, getApiErrorMessage, normalizeListResponse } from "@/lib/api";
import type { UsuarioPendente } from "@/types/api";

function formatarData(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

type WebCadastrosPendentesProps = {
  /** Quando true, omite título (usado na página unificada Usuários) */
  embedded?: boolean;
};

export default function WebCadastrosPendentes({ embedded = false }: WebCadastrosPendentesProps) {
  const [itens, setItens] = useState<UsuarioPendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [aprovandoId, setAprovandoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  const listar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await api.get("/api/usuarios/pendentes");
      const lista = normalizeListResponse<UsuarioPendente>(res.data);
      setItens(lista);
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Não foi possível carregar os cadastros pendentes."));
      setItens([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    listar();
  }, [listar]);

  useEffect(() => {
    if (!mensagemSucesso) return;
    const t = setTimeout(() => setMensagemSucesso(null), 3000);
    return () => clearTimeout(t);
  }, [mensagemSucesso]);

  async function aprovar(usuarioId: string) {
    if (!usuarioId || aprovandoId) return;
    setAprovandoId(usuarioId);
    setErro(null);
    try {
      await api.patch(`/api/usuarios/${usuarioId}/aprovar`, {});
      setMensagemSucesso("Cadastro aprovado com sucesso.");
      await listar();
    } catch (e: unknown) {
      const status = (e as AxiosError).response?.status;
      if (status === 403) {
        setErro("Apenas a proprietária pode aprovar cadastros.");
        return;
      }
      const msg = getApiErrorMessage(e, "Não foi possível aprovar o cadastro.");
      if (msg.includes("Apenas a proprietária")) {
        setErro("Apenas a proprietária pode aprovar cadastros.");
      } else {
        setErro(msg);
      }
    } finally {
      setAprovandoId(null);
    }
  }

  return (
    <div className={embedded ? "page-cadastros-pendentes page-usuarios__subpagina" : "page-cadastros-pendentes"}>
      {!embedded && <h1 className="page-cadastros-pendentes__title">Usuários</h1>}

      {erro && <p className="page-cadastros-pendentes__erro">{erro}</p>}
      {mensagemSucesso && <p className="toast toast--sucesso">{mensagemSucesso}</p>}

      <section className="page-inadimplentes__tabela-secao">
        <div className="page-inadimplentes__tabela-wrap">
          <table className="page-inadimplentes__tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Login</th>
                <th>Data de criação</th>
                <th>Status</th>
                <th className="page-cadastros-pendentes__acao" scope="col">
                  <span className="page-cadastros-pendentes__acao-inner">Ação</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="page-inadimplentes__vazio">
                    Carregando pendentes...
                  </td>
                </tr>
              ) : itens.length === 0 ? (
                <tr>
                  <td colSpan={5} className="page-inadimplentes__vazio">
                    Nenhum cadastro pendente.
                  </td>
                </tr>
              ) : (
                itens.map((u) => {
                  const disabled = aprovandoId === u.usuarioId;
                  return (
                    <tr key={u.usuarioId}>
                      <td>{u.nome}</td>
                      <td>{u.login}</td>
                      <td>{formatarData(u.criadoEm)}</td>
                      <td>{u.statusUsuario}</td>
                      <td className="page-cadastros-pendentes__acao">
                        <div className="page-cadastros-pendentes__acao-inner">
                          <button
                            type="button"
                            className="btn btn--primary btn--small"
                            disabled={disabled || !!aprovandoId}
                            onClick={() => aprovar(u.usuarioId)}
                            title="Aprova o cadastro para que o usuário possa acessar o sistema após aprovação."
                            aria-label={`Aprovar cadastro de ${u.nome}`}
                          >
                            {disabled ? "Aprovando..." : "Aprovar"}
                          </button>
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
    </div>
  );
}
