import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, AUTH_TOKEN_KEY, getApiErrorMessage, isMockEnabled, USER_DISPLAY_KEY } from "@/lib/api";
import type { LoginResponse } from "@/types/api";

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
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

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
      const telefoneDigits = login.replace(/\D/g, "");
      const payload = isMockEnabled() ? { email: loginTrimmed, senha } : { telefone: telefoneDigits || loginTrimmed, senha };
      const res = await api.post<LoginResponse>("/api/auth/login", payload);
      const data = res.data;
      const token = data?.token ?? (data as { accessToken?: string }).accessToken;
      if (token) {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        localStorage.setItem(USER_DISPLAY_KEY, loginTrimmed);
        navigate("/", { replace: true });
      } else {
        setErro("Resposta inválida do servidor (token não retornado).");
      }
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao entrar. Verifique suas credenciais."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-login">
      <header className="topbar" role="banner">
        <div className="topbar__logo">
          <LogoIcon />
        </div>
        <div className="topbar__textos">
          <span className="topbar__titulo">Contabilidade São Judas Tadeu</span>
          <span className="topbar__subtitulo">Sistema de Gerenciamento de Inadimplentes</span>
        </div>
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

        <h1 className="page-login__title">Entrar</h1>
        <p className="page-login__subtitle">Sistema de Gerenciamento de Inadimplentes</p>

        <form onSubmit={handleSubmit} className="page-login__form">
          {erro && <p className="page-login__erro">{erro}</p>}

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
        </form>

        <a href="#" className="page-login__forgot" onClick={(e) => e.preventDefault()}>
          Esqueceu a senha?
        </a>

        {isMockEnabled() && (
          <p className="page-login__mock-hint">Modo mock ativo: use qualquer login e senha para entrar.</p>
        )}
      </div>
    </div>
  );
}
