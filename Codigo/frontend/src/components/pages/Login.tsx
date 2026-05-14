import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, AUTH_TOKEN_KEY, getApiErrorMessage, isMockEnabled, USER_DISPLAY_KEY, USER_LOGIN_KEY, USER_PROFILE_KEY } from "@/lib/api";
import type { LoginResponse, PerfilUsuario } from "@/types/api";
import type { AxiosError } from "axios";

/** Mesmo ícone do logo da sidebar (Layout) */
function LogoIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="4" cy="28" r="4" fill="var(--cor-principal)" />
      <circle cx="12" cy="28" r="4" fill="var(--cor-principal)" />
      <circle cx="20" cy="28" r="4" fill="var(--cor-principal)" />
      <circle cx="28" cy="28" r="4" fill="var(--cor-principal)" />
      <circle cx="12" cy="20" r="4" fill="var(--cor-principal)" />
      <circle cx="20" cy="20" r="4" fill="var(--cor-principal)" />
      <circle cx="28" cy="20" r="4" fill="var(--cor-principal)" />
      <circle cx="20" cy="12" r="4" fill="var(--cor-principal)" />
      <circle cx="28" cy="12" r="4" fill="var(--cor-principal)" />
      <circle cx="28" cy="4" r="4" fill="var(--cor-principal)" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const loginInputRef = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [modo, setModo] = useState<"login" | "signup">("login");
  const [nomeCadastro, setNomeCadastro] = useState("");
  const [loginCadastro, setLoginCadastro] = useState("");
  const [senhaCadastro, setSenhaCadastro] = useState("");
  const [modalRecuperacaoAberto, setModalRecuperacaoAberto] = useState(false);
  const [passoRecuperacao, setPassoRecuperacao] = useState<1 | 2 | 3>(1);
  const [loginRecuperacao, setLoginRecuperacao] = useState("");
  const [nomeRecuperacao, setNomeRecuperacao] = useState("");
  const [novaSenhaRecuperacao, setNovaSenhaRecuperacao] = useState("");
  const [confirmarSenhaRecuperacao, setConfirmarSenhaRecuperacao] = useState("");
  const [erroRecuperacao, setErroRecuperacao] = useState<string | null>(null);
  const [loadingRecuperacao, setLoadingRecuperacao] = useState(false);

  function extrairPerfil(data: LoginResponse): PerfilUsuario | null {
    const bruto = data.perfil ?? data.role ?? data.usuario?.perfil ?? data.usuario?.role;
    if (bruto === "PROPRIETARIA" || bruto === "RESPONSAVEL_FINANCEIRO") return bruto;
    return null;
  }

  function extrairNomeOuLogin(data: LoginResponse, loginPadrao: string): string {
    return String(data.usuario?.nome ?? data.usuario?.login ?? loginPadrao).trim() || loginPadrao;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setMensagemSucesso(null);

    const loginTrimmed = login.trim();
    if (!loginTrimmed) {
      setErro("Login é obrigatório.");
      return;
    }
    if (!senha) {
      setErro("Senha é obrigatória.");
      return;
    }

    setLoading(true);
    try {
      const payload = { login: loginTrimmed, senha };
      const res = await api.post<LoginResponse>("/api/auth/login", payload);
      const data = res.data;
      const token = data?.token ?? (data as { accessToken?: string }).accessToken;
      if (token) {
        const perfil = extrairPerfil(data);
        const nomeExibicao = extrairNomeOuLogin(data, loginTrimmed);
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        localStorage.setItem(USER_DISPLAY_KEY, nomeExibicao);
        localStorage.setItem(USER_LOGIN_KEY, loginTrimmed);
        if (perfil) localStorage.setItem(USER_PROFILE_KEY, perfil);
        else localStorage.removeItem(USER_PROFILE_KEY);
        navigate("/dashboard", { replace: true });
      } else {
        setErro("Resposta inválida do servidor (token não retornado).");
      }
    } catch (e: unknown) {
      const msg = getApiErrorMessage(e, "Falha ao entrar. Verifique suas credenciais.");
      if (msg.toLowerCase().includes("pendente de aprovação")) {
        setErro("Seu cadastro está pendente de aprovação da proprietária.");
      } else {
        setErro(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setMensagemSucesso(null);

    const nomeTrim = nomeCadastro.trim();
    const loginTrim = loginCadastro.trim();
    if (!nomeTrim) {
      setErro("Nome é obrigatório.");
      return;
    }
    if (!loginTrim) {
      setErro("Login é obrigatório.");
      return;
    }
    if (!senhaCadastro) {
      setErro("Senha é obrigatória.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/auth/register", {
        nome: nomeTrim,
        login: loginTrim,
        senha: senhaCadastro,
      });
      setMensagemSucesso("Cadastro realizado com sucesso. Aguarde aprovação da proprietária para acessar o sistema.");
      setModo("login");
      setLogin(loginTrim);
      setSenha("");
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Não foi possível realizar o cadastro. Verifique os dados e tente novamente."));
    } finally {
      setLoading(false);
    }
  }

  function abrirRecuperacaoSenha() {
    setErro(null);
    setMensagemSucesso(null);
    setErroRecuperacao(null);
    setPassoRecuperacao(1);
    setLoginRecuperacao(login.trim());
    setNomeRecuperacao("");
    setNovaSenhaRecuperacao("");
    setConfirmarSenhaRecuperacao("");
    setModalRecuperacaoAberto(true);
  }

  function fecharRecuperacaoSenha() {
    if (loadingRecuperacao) return;
    setModalRecuperacaoAberto(false);
    setErroRecuperacao(null);
    setPassoRecuperacao(1);
  }

  function concluirRecuperacaoSenha() {
    setModalRecuperacaoAberto(false);
    setPassoRecuperacao(1);
    setErroRecuperacao(null);
    setMensagemSucesso("Senha alterada com sucesso.");
    setModo("login");
    setLogin(loginRecuperacao.trim());
    setSenha("");
    setTimeout(() => loginInputRef.current?.focus(), 0);
  }

  function getMensagemErroRecuperacao(e: unknown, fallback: string): string {
    const status = (e as AxiosError<{ message?: string; error?: string }> | undefined)?.response?.status;
    if (status === 404) return "Usuário não encontrado";
    if (status === 422) return getApiErrorMessage(e, fallback);
    return getApiErrorMessage(e, fallback);
  }

  async function validarLoginRecuperacao(e: React.FormEvent) {
    e.preventDefault();
    setErroRecuperacao(null);
    const loginTrim = loginRecuperacao.trim();
    if (!loginTrim) {
      setErroRecuperacao("Login é obrigatório.");
      return;
    }
    setLoadingRecuperacao(true);
    try {
      if (isMockEnabled()) {
        setNomeRecuperacao("Usuário de Teste");
        setPassoRecuperacao(2);
        return;
      }
      const res = await api.post<{ encontrado?: boolean; login?: string; nome?: string }>("/api/auth/validar-login-recuperacao", {
        login: loginTrim,
      });
      if (!res.data?.encontrado) {
        setErroRecuperacao("Usuário não encontrado");
        return;
      }
      setLoginRecuperacao(String(res.data.login ?? loginTrim));
      setNomeRecuperacao(String(res.data.nome ?? ""));
      setPassoRecuperacao(2);
    } catch (e: unknown) {
      setErroRecuperacao(getMensagemErroRecuperacao(e, "Não foi possível validar o login"));
    } finally {
      setLoadingRecuperacao(false);
    }
  }

  async function redefinirSenhaRecuperacao(e: React.FormEvent) {
    e.preventDefault();
    setErroRecuperacao(null);
    const loginTrim = loginRecuperacao.trim();
    if (!novaSenhaRecuperacao || !confirmarSenhaRecuperacao) {
      setErroRecuperacao("Nova senha e confirmação são obrigatórias.");
      return;
    }
    if (novaSenhaRecuperacao !== confirmarSenhaRecuperacao) {
      setErroRecuperacao("A confirmação da senha não confere.");
      return;
    }
    setLoadingRecuperacao(true);
    try {
      if (!isMockEnabled()) {
        await api.post("/api/auth/redefinir-senha", {
          login: loginTrim,
          novaSenha: novaSenhaRecuperacao,
          confirmarSenha: confirmarSenhaRecuperacao,
        });
      }
      setPassoRecuperacao(3);
    } catch (e: unknown) {
      setErroRecuperacao(getMensagemErroRecuperacao(e, "Não foi possível alterar senha"));
    } finally {
      setLoadingRecuperacao(false);
    }
  }

  const mostrandoLogin = modo === "login";

  return (
    <div className="page-login">
      <header className="topbar" role="banner">
        <Link to="/" className="topbar__brand-link" aria-label="Ir para a página institucional">
          <div className="topbar__logo">
            <LogoIcon />
          </div>
          <div className="topbar__textos">
            <span className="topbar__titulo">Contabilidade São Judas Tadeu</span>
            <span className="topbar__subtitulo">Sistema de Gerenciamento de Inadimplentes</span>
          </div>
        </Link>
      </header>
      <div className="page-login__card">
        <header className="page-login__header">
          <div className="page-login__logo">
            <LogoIcon />
          </div>
          <div className="page-login__brand">
            <span className="page-login__brand-title">Contabilidade Sao</span>
            <span className="page-login__brand-title">Judas Tadeu</span>
            <span className="page-login__brand-sub">Sistema de Gerenciamento</span>
            <span className="page-login__brand-sub">de Inadimplentes</span>
          </div>
        </header>

        <h1 className="page-login__title">{mostrandoLogin ? "Entrar" : "Criar conta"}</h1>
        <p className="page-login__subtitle">
          {mostrandoLogin ? "Sistema de Gerenciamento de Inadimplentes" : "Preencha seus dados para começar a usar o sistema"}
        </p>

        {erro && <p className="page-login__erro">{erro}</p>}
        {mensagemSucesso && <p className="page-login__sucesso">{mensagemSucesso}</p>}

        {mostrandoLogin ? (
          <form onSubmit={handleSubmit} className="page-login__form">
            <div className="page-login__input-wrap">
              <span className="page-login__input-icon" aria-hidden="true">
                <UserIcon />
              </span>
              <input
                type="text"
                autoComplete="username"
                placeholder="Login"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="page-login__input"
                disabled={loading}
                aria-label="Login"
                ref={loginInputRef}
              />
            </div>

            <div className="page-login__input-wrap">
              <span className="page-login__input-icon" aria-hidden="true">
                <LockIcon />
              </span>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="Senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="page-login__input"
                disabled={loading}
                aria-label="Senha"
              />
            </div>

            <button type="submit" className="page-login__btn" disabled={loading}>
              {loading ? "Entrando…" : "Entrar"}
            </button>

            <a href="#" className="page-login__forgot" onClick={(e) => {
              e.preventDefault();
              abrirRecuperacaoSenha();
            }}>
              Esqueceu a senha?
            </a>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="page-login__form">
            <div className="page-login__input-wrap">
              <span className="page-login__input-icon" aria-hidden="true">
                <UserIcon />
              </span>
              <input
                type="text"
                autoComplete="name"
                placeholder="Nome completo"
                value={nomeCadastro}
                onChange={(e) => setNomeCadastro(e.target.value)}
                className="page-login__input"
                disabled={loading}
                aria-label="Nome completo"
              />
            </div>

            <div className="page-login__input-wrap">
              <span className="page-login__input-icon" aria-hidden="true">
                <UserIcon />
              </span>
              <input
                type="text"
                autoComplete="username"
                placeholder="Login (usuário ou telefone)"
                value={loginCadastro}
                onChange={(e) => setLoginCadastro(e.target.value)}
                className="page-login__input"
                disabled={loading}
                aria-label="Login para acesso"
              />
            </div>

            <div className="page-login__input-wrap">
              <span className="page-login__input-icon" aria-hidden="true">
                <LockIcon />
              </span>
              <input
                type="password"
                autoComplete="new-password"
                placeholder="Senha"
                value={senhaCadastro}
                onChange={(e) => setSenhaCadastro(e.target.value)}
                className="page-login__input"
                disabled={loading}
                aria-label="Senha para acesso"
              />
            </div>

            <button type="submit" className="page-login__btn" disabled={loading}>
              {loading ? "Cadastrando…" : "Cadastrar"}
            </button>
          </form>
        )}

        <button
          type="button"
          className="page-login__forgot page-login__toggle-signup"
          onClick={() => {
            setErro(null);
            setMensagemSucesso(null);
            setModo(mostrandoLogin ? "signup" : "login");
          }}
          disabled={loading}
        >
          {mostrandoLogin ? "Ainda não tenho cadastro" : "Já tenho cadastro"}
        </button>

        {isMockEnabled() && (
          <p className="page-login__mock-hint">Modo mock ativo: use qualquer login e senha para entrar.</p>
        )}
      </div>

      {modalRecuperacaoAberto && (
        <div className="modal-overlay page-login__recuperacao-overlay" onClick={fecharRecuperacaoSenha}>
          <div className="modal page-login__recuperacao-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__titulo">Recuperar senha</h2>
            <p className="page-login__recuperacao-step">Passo {passoRecuperacao} de 2</p>
            {erroRecuperacao && <p className="page-login__erro">{erroRecuperacao}</p>}

            {passoRecuperacao === 1 && (
              <form className="page-login__form" onSubmit={validarLoginRecuperacao}>
                <div className="page-login__input-wrap">
                  <span className="page-login__input-icon" aria-hidden="true">
                    <UserIcon />
                  </span>
                  <input
                    type="text"
                    autoComplete="username"
                    placeholder="Informe seu login"
                    value={loginRecuperacao}
                    onChange={(e) => setLoginRecuperacao(e.target.value)}
                    className="page-login__input"
                    disabled={loadingRecuperacao}
                    aria-label="Login para recuperação"
                  />
                </div>
                <div className="modal__botoes">
                  <button type="button" className="btn btn--secondary" onClick={fecharRecuperacaoSenha} disabled={loadingRecuperacao}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn--primary" disabled={loadingRecuperacao}>
                    {loadingRecuperacao ? "Validando..." : "Continuar"}
                  </button>
                </div>
              </form>
            )}

            {passoRecuperacao === 2 && (
              <form className="page-login__form" onSubmit={redefinirSenhaRecuperacao}>
                <p className="page-login__recuperacao-helper">
                  Login encontrado{nomeRecuperacao ? ` para ${nomeRecuperacao}` : ""}. Defina sua nova senha.
                </p>
                <div className="page-login__input-wrap">
                  <span className="page-login__input-icon" aria-hidden="true">
                    <LockIcon />
                  </span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder="Nova senha"
                    value={novaSenhaRecuperacao}
                    onChange={(e) => setNovaSenhaRecuperacao(e.target.value)}
                    className="page-login__input"
                    disabled={loadingRecuperacao}
                    aria-label="Nova senha"
                  />
                </div>
                <div className="page-login__input-wrap">
                  <span className="page-login__input-icon" aria-hidden="true">
                    <LockIcon />
                  </span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder="Confirmar nova senha"
                    value={confirmarSenhaRecuperacao}
                    onChange={(e) => setConfirmarSenhaRecuperacao(e.target.value)}
                    className="page-login__input"
                    disabled={loadingRecuperacao}
                    aria-label="Confirmar nova senha"
                  />
                </div>
                <div className="modal__botoes">
                  <button type="button" className="btn btn--secondary" onClick={() => setPassoRecuperacao(1)} disabled={loadingRecuperacao}>
                    Voltar
                  </button>
                  <button type="submit" className="btn btn--primary" disabled={loadingRecuperacao}>
                    {loadingRecuperacao ? "Alterando..." : "Salvar nova senha"}
                  </button>
                </div>
              </form>
            )}

            {passoRecuperacao === 3 && (
              <div className="page-login__recuperacao-sucesso">
                <p className="page-login__sucesso">Senha alterada com sucesso.</p>
                <div className="modal__botoes">
                  <button type="button" className="btn btn--primary" onClick={concluirRecuperacaoSenha}>
                    Voltar para login
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
