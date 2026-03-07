import { useEffect, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api";
import type { CadastroUsuarioPayload } from "@/types/api";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

const OPCOES_FUNCAO = [
  { value: "", label: "Selecionar" },
  { value: "admin", label: "Administrador" },
  { value: "usuario", label: "Usuário" },
  { value: "operador", label: "Operador" },
];

const OPCOES_PERMISSAO = [
  { value: "corporativo", label: "Corporativo" },
  { value: "filial", label: "Filial" },
  { value: "operador", label: "Operador" },
];

const OPCOES_PLANTA = [
  { value: "", label: "Selecionar" },
  { value: "planta1", label: "Planta 1" },
  { value: "planta2", label: "Planta 2" },
];

export default function WebCadastroUsuario() {
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CadastroUsuarioPayload & { confirmarSenha?: string }>({
    nome: "",
    email: "",
    ativo: true,
    telefone1: "",
    telefone2: "",
    funcao: "",
    permissao: "corporativo",
    planta: "",
    senha: "",
    confirmarSenha: "",
  });

  useEffect(() => {
    if (!sucesso) return;
    const t = setTimeout(() => setSucesso(false), 4000);
    return () => clearTimeout(t);
  }, [sucesso]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSucesso(false);

    if (!form.nome?.trim()) {
      setErro("Nome do usuário é obrigatório.");
      return;
    }
    if (!form.email?.trim()) {
      setErro("E-mail é obrigatório.");
      return;
    }
    if (!isValidEmail(form.email)) {
      setErro("E-mail inválido.");
      return;
    }
    if (!form.telefone1?.trim()) {
      setErro("Telefone 1 é obrigatório.");
      return;
    }
    if (!form.funcao) {
      setErro("Função é obrigatória.");
      return;
    }
    if (!form.permissao) {
      setErro("Permissão é obrigatória.");
      return;
    }
    if (!form.planta) {
      setErro("Planta é obrigatória.");
      return;
    }
    if (form.senha && form.senha.length < 6) {
      setErro("Senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (form.senha && form.senha !== form.confirmarSenha) {
      setErro("Senha e confirmar senha não conferem.");
      return;
    }

    setLoading(true);
    try {
      const payload: CadastroUsuarioPayload = {
        nome: form.nome.trim(),
        email: form.email.trim().toLowerCase(),
        ativo: form.ativo,
        telefone1: form.telefone1?.replace(/\D/g, "") || undefined,
        telefone2: form.telefone2?.replace(/\D/g, "") || undefined,
        funcao: form.funcao,
        permissao: form.permissao,
        planta: form.planta,
      };
      if (form.senha) payload.senha = form.senha;
      await api.post("/api/usuarios", payload);
      setSucesso(true);
      setForm({
        nome: "",
        email: "",
        ativo: true,
        telefone1: "",
        telefone2: "",
        funcao: "",
        permissao: "corporativo",
        planta: "",
        senha: "",
        confirmarSenha: "",
      });
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao cadastrar usuário. Tente novamente."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-cadastro-usuario">
      <h1 className="page-cadastro-usuario__title">Cadastrar usuário</h1>

      <form onSubmit={handleSubmit} className="page-cadastro-usuario__form">
        {erro && <p className="page-cadastro-usuario__erro">{erro}</p>}
        {sucesso && (
          <p className="toast toast--sucesso">Usuário cadastrado com sucesso.</p>
        )}

        <div className="page-cadastro-usuario__row page-cadastro-usuario__row--toggle">
          <div className="page-cadastro-usuario__field">
            <label className="modal__label">Nome do usuário *</label>
            <input
              type="text"
              placeholder="Digitar"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="modal__input"
              disabled={loading}
            />
          </div>
          <div className="page-cadastro-usuario__toggle-wrap">
            <span className="page-cadastro-usuario__toggle-label">Este usuário está ativo</span>
            <button
              type="button"
              role="switch"
              aria-checked={form.ativo}
              className={`page-cadastro-usuario__toggle ${form.ativo ? "page-cadastro-usuario__toggle--on" : ""}`}
              onClick={() => setForm({ ...form, ativo: !form.ativo })}
              disabled={loading}
            >
              <span className="page-cadastro-usuario__toggle-thumb" />
            </button>
          </div>
        </div>

        <label className="modal__label">Email *</label>
        <input
          type="email"
          placeholder="Digitar"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="modal__input"
          pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
          title="Informe um e-mail válido"
          disabled={loading}
        />

        <div className="page-cadastro-usuario__row page-cadastro-usuario__row--two">
          <div className="page-cadastro-usuario__field">
            <label className="modal__label">Telefone 1 *</label>
            <input
              type="tel"
              placeholder="Digitar"
              value={form.telefone1}
              onChange={(e) => setForm({ ...form, telefone1: e.target.value })}
              className="modal__input"
              disabled={loading}
            />
          </div>
          <div className="page-cadastro-usuario__field">
            <label className="modal__label">Telefone 2</label>
            <input
              type="tel"
              placeholder="Digitar"
              value={form.telefone2}
              onChange={(e) => setForm({ ...form, telefone2: e.target.value })}
              className="modal__input"
              disabled={loading}
            />
          </div>
        </div>

        <label className="modal__label">Função *</label>
        <select
          value={form.funcao}
          onChange={(e) => setForm({ ...form, funcao: e.target.value })}
          className="modal__input modal__select"
          disabled={loading}
        >
          {OPCOES_FUNCAO.map((op) => (
            <option key={op.value} value={op.value}>{op.label}</option>
          ))}
        </select>

        <div className="page-cadastro-usuario__row page-cadastro-usuario__row--two">
          <div className="page-cadastro-usuario__field">
            <label className="modal__label">Permissão *</label>
            <select
              value={form.permissao}
              onChange={(e) => setForm({ ...form, permissao: e.target.value })}
              className="modal__input modal__select"
              disabled={loading}
            >
              {OPCOES_PERMISSAO.map((op) => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
          </div>
          <div className="page-cadastro-usuario__field page-cadastro-usuario__field--with-add">
            <label className="modal__label">Planta *</label>
            <div className="page-cadastro-usuario__input-add">
              <select
                value={form.planta}
                onChange={(e) => setForm({ ...form, planta: e.target.value })}
                className="modal__input modal__select"
                disabled={loading}
              >
                {OPCOES_PLANTA.map((op) => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
              <button type="button" className="page-cadastro-usuario__add-btn" title="Adicionar planta" disabled={loading}>
                <PlusIcon />
              </button>
            </div>
          </div>
        </div>

        <div className="page-cadastro-usuario__botoes">
          <button type="button" className="btn btn--secondary" onClick={() => setErro(null)} disabled={loading}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--primary" disabled={loading}>
            {loading ? "Cadastrando..." : "Cadastrar"}
          </button>
        </div>
      </form>
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
