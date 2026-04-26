import type {
  Cliente,
  Inadimplencia,
  ResumoRelatorio,
  ResumoFinanceiro,
  RankingDevedorItem,
  ExtratoCliente,
  InadimplenciaPeriodoRelatorio,
  PagamentosRecebidosRelatorio,
  AgingRelatorio,
  EfetividadeCobrancaRelatorio,
  PerfilUsuario,
  UsuarioAtivo,
  UsuarioPendente,
} from "@/types/api";

const store = {
  clientes: [] as Cliente[],
  inadimplentes: [] as Inadimplencia[],
  usuarios: [
    {
      usuarioId: "u-proprietaria",
      login: "proprietaria",
      nome: "Usuária Proprietária",
      telefone: "(11) 99999-0001",
      perfil: "PROPRIETARIA" as PerfilUsuario,
      statusUsuario: "ATIVO",
      ultimoAcesso: null as string | null,
      criadoEm: "2026-01-01T09:00:00",
      senha: "123456",
    },
    {
      usuarioId: "u-financeiro",
      login: "financeiro",
      nome: "Responsável Financeiro",
      telefone: "(11) 98888-0002",
      perfil: "RESPONSAVEL_FINANCEIRO" as PerfilUsuario,
      statusUsuario: "ATIVO",
      ultimoAcesso: null as string | null,
      criadoEm: "2026-01-02T09:00:00",
      senha: "123456",
    },
  ],
};

let nextId = 1;

function nextIdCliente(): string {
  return String(nextId++);
}
function nextIdInadimplencia(): string {
  return String(nextId++);
}

function getClienteNome(clienteId: string): string {
  const c = store.clientes.find((x) => x.id === clienteId);
  return c?.nome ?? `Cliente #${clienteId}`;
}

function getCliente(id: string): Cliente | undefined {
  return store.clientes.find((x) => x.id === id);
}

function diasAtraso(vencimento: string): number {
  const v = new Date(vencimento.split("T")[0]);
  const hoje = new Date();
  v.setHours(0, 0, 0, 0);
  hoje.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((hoje.getTime() - v.getTime()) / (24 * 60 * 60 * 1000)));
}

function protocolo(id: string | number, vencimento: string): string {
  const d = vencimento.split("T")[0].replace(/-/g, "");
  return `DIV-${d}-${String(id).padStart(4, "0")}`;
}

function getCurrentUserByToken() {
  if (typeof localStorage === "undefined") return null;
  const token = localStorage.getItem("sgi_token");
  if (!token) return null;
  const userId = token.replace("mock-token-", "");
  return store.usuarios.find((u) => u.usuarioId === userId) ?? null;
}

export function createMockClient() {
  return {
    get<T = unknown>(url: string) {
      if (url === "/api/clientes") {
        const list = store.clientes.map((c) => ({ ...c, id: String(c.id) }));
        return Promise.resolve({ data: list } as { data: T });
      }
      if (url === "/api/inadimplentes") {
        const itens = store.inadimplentes.map((i) => ({
          ...i,
          clienteNome: getClienteNome(i.clienteId),
        }));
        return Promise.resolve({ data: itens } as { data: T });
      }
      if (url.startsWith("/api/relatorios/resumo")) {
        const urlObj = new URL(url, "http://x");
        const diasParam = urlObj.searchParams.get("dias");
        const periodoInicio = urlObj.searchParams.get("periodoInicio");
        const periodoFim = urlObj.searchParams.get("periodoFim");
        const dias = diasParam ? Number(diasParam) : null;
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const filtrarPorDias = (dataIso: string) => {
          if (dias == null || !dataIso) return true;
          const d = new Date(dataIso.split("T")[0]);
          d.setHours(0, 0, 0, 0);
          const limite = new Date(hoje);
          limite.setDate(limite.getDate() - dias);
          return d >= limite;
        };
        let base = store.inadimplentes;
        if (dias != null && !Number.isNaN(dias)) {
          base = base.filter((i) => filtrarPorDias(i.vencimento));
        }
        if (periodoInicio || periodoFim) {
          const inicio = periodoInicio ? new Date(periodoInicio) : new Date(0);
          const fim = periodoFim ? new Date(periodoFim) : new Date();
          base = base.filter((i) => {
            const dt = new Date((i.updatedAt ?? i.createdAt ?? i.vencimento).split("T")[0]);
            return dt >= inicio && dt <= fim;
          });
        }
        const emAberto = base.filter((i) => (i.status ?? "EmAberto") === "EmAberto");
        const todosPagos = base.filter((i) => i.status === "Pago");
        const totalPago = todosPagos.reduce((s, i) => s + (i.valor ?? 0), 0);
        if (url.startsWith("/api/relatorios/resumo-financeiro")) {
          const resumoFinanceiro: ResumoFinanceiro = {
            totalEmAberto: emAberto.reduce((s, i) => s + (i.valor ?? 0), 0),
            totalRecebido: totalPago,
            periodoInicio: periodoInicio ?? undefined,
            periodoFim: periodoFim ?? undefined,
          };
          return Promise.resolve({ data: resumoFinanceiro } as { data: T });
        }
        const resumo: ResumoRelatorio = {
          totalClientes: store.clientes.length,
          totalDividas: base.length,
          totalEmAberto: emAberto.reduce((s, i) => s + (i.valor ?? 0), 0),
          totalPago,
        };
        return Promise.resolve({ data: resumo } as { data: T });
      }

      if (url.startsWith("/api/relatorios/ranking-devedores")) {
        const urlObj = new URL(url, "http://x");
        const limit = Math.min(50, Math.max(10, Number(urlObj.searchParams.get("limit")) || 20));
        const valorMin = Number(urlObj.searchParams.get("valorMin")) || 0;
        const qtdDividasMin = Number(urlObj.searchParams.get("qtdDividas")) || 0;
        const diasAtrasoMin = Number(urlObj.searchParams.get("diasAtraso")) || 0;

        const emAberto = store.inadimplentes.filter((i) => (i.status ?? "EmAberto") !== "Pago");
        const porCliente = new Map<
          string,
          { valor: number; qtd: number; dias: number[] }
        >();
        for (const d of emAberto) {
          const dias = diasAtraso(d.vencimento);
          const cid = String(d.clienteId);
          const cur = porCliente.get(cid);
          if (!cur) {
            porCliente.set(cid, { valor: d.valor, qtd: 1, dias: [dias] });
          } else {
            cur.valor += d.valor;
            cur.qtd += 1;
            cur.dias.push(dias);
          }
        }
        let items: RankingDevedorItem[] = [];
        porCliente.forEach((v, clienteId) => {
          if (v.valor < valorMin || v.qtd < qtdDividasMin) return;
          const mediaDias = Math.round(v.dias.reduce((a, b) => a + b, 0) / v.dias.length);
          if (mediaDias < diasAtrasoMin) return;
          const status: RankingDevedorItem["status"] =
            mediaDias > 60 ? "Crítico" : mediaDias > 30 ? "Atenção" : "Recente";
          const c = getCliente(clienteId);
          items.push({
            posicao: 0,
            clienteId,
            clienteNome: getClienteNome(clienteId),
            cpfCnpj: c?.cpf ?? "",
            valorDevido: v.valor,
            qtdDividas: v.qtd,
            mediaDiasAtraso: mediaDias,
            status,
          });
        });
        items.sort((a, b) => b.valorDevido - a.valorDevido);
        items = items.slice(0, limit).map((it, i) => ({ ...it, posicao: i + 1 }));
        return Promise.resolve({ data: items } as { data: T });
      }

      const matchExtrato = url.match(/^\/api\/relatorios\/extrato-cliente\/([\w-]+)$/);
      if (matchExtrato) {
        const clienteId = String(matchExtrato[1]);
        const c = getCliente(clienteId);
        if (!c) return Promise.reject(new Error(`Mock: cliente ${clienteId} não encontrado`));
        const dividasCliente = store.inadimplentes.filter(
          (d) => d.clienteId === clienteId && (d.status ?? "EmAberto") !== "Pago"
        );
        const dividasAtivas = dividasCliente.map((d) => ({
          id: d.id ?? 0,
          protocolo: protocolo(d.id ?? 0, d.vencimento),
          descricao: d.descricao ?? `Serviços ${d.vencimento.slice(0, 7)}`,
          vencimento: d.vencimento.split("T")[0],
          valorOriginal: d.valor,
          valorDevido: d.valor,
          status: (d.status ?? "EmAberto") === "EmAberto" ? "Em aberto" : "Parcial",
          diasAtraso: diasAtraso(d.vencimento),
        }));
        const saldoTotal = dividasAtivas.reduce((s, d) => s + d.valorDevido, 0);
        const pagos = store.inadimplentes.filter(
          (d) => d.clienteId === clienteId && d.status === "Pago"
        );
        const historicoPagamentos = pagos.map((d) => ({
          data: (d.updatedAt ?? d.createdAt ?? d.vencimento).split("T")[0],
          protocolo: protocolo(d.id ?? "0", d.vencimento),
          valorPago: d.valor,
          metodo: "PIX",
          saldoApos: 0,
        }));
        const notificacoes = [
          { data: new Date().toISOString().split("T")[0], tipo: "Cobrança", status: "Enviado", tentativas: 1 },
        ];
        const extrato: ExtratoCliente = {
          cliente: {
            nome: c.nome,
            cpfCnpj: c.cpf ?? "",
            telefone: c.telefone,
            email: c.email,
            status: c.situacao ?? "Ativo",
            saldoDevedorTotal: saldoTotal,
          },
          dividasAtivas,
          historicoPagamentos,
          notificacoes,
        };
        return Promise.resolve({ data: extrato } as { data: T });
      }

      if (url.startsWith("/api/relatorios/inadimplencia-periodo")) {
        const urlObj = new URL(url, "http://x");
        const dataInicio = urlObj.searchParams.get("dataInicio") ?? "";
        const dataFim = urlObj.searchParams.get("dataFim") ?? "";
        const inicio = dataInicio ? new Date(dataInicio) : new Date(0);
        const fim = dataFim ? new Date(dataFim) : new Date();
        const emAberto = store.inadimplentes.filter((i) => (i.status ?? "EmAberto") !== "Pago");
        const noPeriodo = emAberto.filter((d) => {
          const v = new Date(d.vencimento.split("T")[0]);
          return v >= inicio && v <= fim;
        });
        const porCliente = new Map<
          string,
          { qtd: number; valor: number; statusPior: InadimplenciaPeriodoRelatorio["detalhamento"][0]["statusPior"] }
        >();
        const statusOrd = (s: InadimplenciaPeriodoRelatorio["detalhamento"][0]["statusPior"]) =>
          s === "VENCIDA" ? 3 : s === "PARCIAL" ? 2 : 1;
        for (const d of noPeriodo) {
          const dias = diasAtraso(d.vencimento);
          const statusMap: InadimplenciaPeriodoRelatorio["detalhamento"][0]["statusPior"] =
            dias > 0 ? "VENCIDA" : (d.status ?? "EmAberto") === "EmAberto" ? "EM_ABERTO" : "PARCIAL";
          const cur = porCliente.get(d.clienteId);
          if (!cur) {
            porCliente.set(d.clienteId, { qtd: 1, valor: d.valor, statusPior: statusMap });
          } else {
            cur.qtd += 1;
            cur.valor += d.valor;
            if (statusOrd(statusMap) > statusOrd(cur.statusPior)) cur.statusPior = statusMap;
          }
        }
        const detalhamento = Array.from(porCliente.entries()).map(([clienteId, v]) => {
          const c = getCliente(clienteId);
          return {
            clienteId,
            clienteNome: getClienteNome(clienteId),
            cpfCnpj: c?.cpf ?? "",
            qtdDividas: v.qtd,
            valorTotal: v.valor,
            statusPior: v.statusPior,
          };
        });
        detalhamento.sort((a, b) => b.valorTotal - a.valorTotal);
        const valorVencido = noPeriodo.reduce((s, d) => s + d.valor, 0);
        const res: InadimplenciaPeriodoRelatorio = {
          dataInicio,
          dataFim,
          totalClientes: porCliente.size,
          valorTotal: valorVencido,
          dividasVencidasNoPeriodo: noPeriodo.length,
          valorVencidoNoPeriodo: valorVencido,
          detalhamento,
        };
        return Promise.resolve({ data: res } as { data: T });
      }

      if (url.startsWith("/api/relatorios/pagamentos-recebidos")) {
        const urlObj = new URL(url, "http://x");
        const dataInicio = urlObj.searchParams.get("dataInicio") ?? "";
        const dataFim = urlObj.searchParams.get("dataFim") ?? "";
        const inicio = dataInicio ? new Date(dataInicio) : new Date(0);
        const fim = dataFim ? new Date(dataFim) : new Date();
        const pagos = store.inadimplentes.filter((d) => d.status === "Pago");
        const noPeriodo = pagos.filter((d) => {
          const dt = (d.updatedAt ?? d.createdAt ?? d.vencimento).split("T")[0];
          const v = new Date(dt);
          return v >= inicio && v <= fim;
        });
        const metodos = ["PIX", "Transferência", "Dinheiro"] as const;
        const porMetodo = metodos.map((metodo, i) => {
          const frac = i === 0 ? 0.65 : i === 1 ? 0.25 : 0.1;
          const valor = Math.round(noPeriodo.reduce((s, d) => s + d.valor, 0) * frac);
          return { metodo, valor, percentual: 0 };
        });
        const total = porMetodo.reduce((s, m) => s + m.valor, 0);
        porMetodo.forEach((m) => {
          m.percentual = total > 0 ? (m.valor / total) * 100 : 0;
        });
        const detalhamento = noPeriodo.map((d) => ({
          data: (d.updatedAt ?? d.createdAt ?? d.vencimento).split("T")[0],
          clienteNome: getClienteNome(d.clienteId),
          protocolo: protocolo(d.id ?? "0", d.vencimento),
          valor: d.valor,
          metodo: "PIX",
          saldoRestante: 0,
        }));
        const res: PagamentosRecebidosRelatorio = {
          dataInicio,
          dataFim,
          totalPagamentos: noPeriodo.length,
          valorTotal: total,
          porMetodo,
          detalhamento,
        };
        return Promise.resolve({ data: res } as { data: T });
      }

      if (url.startsWith("/api/relatorios/aging")) {
        const emAberto = store.inadimplentes.filter((i) => (i.status ?? "EmAberto") !== "Pago");
        const faixas = [
          { nome: "0-30 dias", min: 0, max: 30 },
          { nome: "31-60 dias", min: 31, max: 60 },
          { nome: "61-90 dias", min: 61, max: 90 },
          { nome: "Acima de 90 dias", min: 91, max: 9999 },
        ];
        const valorTotalGeral = emAberto.reduce((s, d) => s + d.valor, 0);
        const faixasRes = faixas.map((f) => {
          const divs = emAberto.filter((d) => {
            const dias = diasAtraso(d.vencimento);
            return dias >= f.min && dias <= f.max;
          });
          const valorTotal = divs.reduce((s, d) => s + d.valor, 0);
          const percentual = valorTotalGeral > 0 ? (valorTotal / valorTotalGeral) * 100 : 0;
          return {
            faixa: f.nome,
            qtdDividas: divs.length,
            valorTotal,
            percentual,
          };
        });
        const res: AgingRelatorio = { faixas: faixasRes, valorTotalGeral };
        return Promise.resolve({ data: res } as { data: T });
      }

      if (url.startsWith("/api/relatorios/efetividade-cobranca")) {
        const urlObj = new URL(url, "http://x");
        const mes = urlObj.searchParams.get("mes") ?? new Date().toISOString().slice(0, 7);
        const res: EfetividadeCobrancaRelatorio = {
          periodo: mes,
          totalNotificacoes: 45,
          emailsEntregues: 42,
          falhas: 3,
          taxaEntrega: 93.3,
          cobrancasComPagamento: 18,
          taxaConversao: 40,
          tempoMedioDias: 5.2,
          comparativoAnterior: {
            periodo: "Dez/2024",
            taxaConversao: 35.2,
            variacaoPp: 4.8,
          },
        };
        return Promise.resolve({ data: res } as { data: T });
      }
      if (url === "/api/usuarios/pendentes") {
        const pendentes: UsuarioPendente[] = store.usuarios
          .filter((u) => u.statusUsuario === "PENDENTE_APROVACAO")
          .map(({ senha: _s, telefone: _t, ...u }) => u);
        return Promise.resolve({ data: pendentes } as { data: T });
      }
      if (url === "/api/usuarios/ativos") {
        const ativos: UsuarioAtivo[] = store.usuarios
          .filter((u) => u.statusUsuario === "ATIVO")
          .map(({ senha: _s, ...u }) => u as UsuarioAtivo);
        return Promise.resolve({ data: ativos } as { data: T });
      }

      return Promise.reject(new Error(`Mock: rota não encontrada: ${url}`));
    },

    post<T = unknown>(url: string, body: unknown) {
      if (url === "/api/auth/login") {
        const payload = (body ?? {}) as { login?: string; senha?: string };
        const login = String(payload.login ?? "").trim();
        const senha = String(payload.senha ?? "");
        const user = store.usuarios.find((u) => u.login === login);
        if (!user || user.senha !== senha) return Promise.reject(new Error("Credenciais inválidas."));
        if (user.statusUsuario === "PENDENTE_APROVACAO") {
          return Promise.reject(new Error("Cadastro pendente de aprovação da proprietária."));
        }
        return Promise.resolve({
          data: {
            token: `mock-token-${user.usuarioId}`,
            perfil: user.perfil,
            usuario: {
              nome: user.nome,
              login: user.login,
              perfil: user.perfil,
            },
          },
        } as { data: T });
      }
      if (url === "/api/auth/register") {
        const payload = (body ?? {}) as { nome?: string; login?: string; senha?: string };
        const nome = String(payload.nome ?? "").trim();
        const login = String(payload.login ?? "").trim();
        const senha = String(payload.senha ?? "");
        if (!nome || !login || !senha) {
          return Promise.reject(new Error("Nome, login e senha são obrigatórios."));
        }
        const loginExiste = store.usuarios.some((u) => u.login.toLowerCase() === login.toLowerCase());
        if (loginExiste) return Promise.reject(new Error("Login já cadastrado."));
        const novoId = `u-${Date.now()}`;
        store.usuarios.push({
          usuarioId: novoId,
          login,
          nome,
          telefone: "",
          perfil: "RESPONSAVEL_FINANCEIRO",
          statusUsuario: "PENDENTE_APROVACAO",
          ultimoAcesso: null,
          criadoEm: new Date().toISOString(),
          senha,
        });
        return Promise.resolve({ data: { ok: true } } as { data: T });
      }
      if (url === "/api/clientes") {
        const payload = body as Cliente;
        const novo: Cliente = {
          ...payload,
          id: nextIdCliente(),
          situacao: payload.situacao ?? "Ativo",
        };
        store.clientes.push(novo);
        return Promise.resolve({ data: novo } as { data: T });
      }
      if (url === "/api/inadimplentes") {
        const payload = body as Inadimplencia;
        const novo: Inadimplencia = {
          ...payload,
          id: nextIdInadimplencia(),
          status: payload.status ?? "EmAberto",
          clienteNome: getClienteNome(payload.clienteId),
        };
        store.inadimplentes.push(novo);
        return Promise.resolve({ data: novo } as { data: T });
      }
      return Promise.reject(new Error(`Mock: rota não encontrada: ${url}`));
    },

    patch<T = unknown>(url: string, body: unknown) {
      const matchAprovarUsuario = url.match(/^\/api\/usuarios\/([\w-]+)\/aprovar$/);
      if (matchAprovarUsuario) {
        const usuarioId = matchAprovarUsuario[1];
        const userAtual = getCurrentUserByToken();
        const perfilStorage =
          typeof localStorage !== "undefined" ? (localStorage.getItem("sgi_user_profile") as PerfilUsuario | null) : null;
        const perfilAtual = userAtual?.perfil ?? perfilStorage;
        if (perfilAtual !== "PROPRIETARIA") {
          return Promise.reject(new Error("Apenas a proprietária pode aprovar cadastros."));
        }
        const idx = store.usuarios.findIndex((u) => u.usuarioId === usuarioId);
        if (idx === -1) return Promise.reject(new Error("Usuário não encontrado."));
        const atual = store.usuarios[idx];
        const aprovado = { ...atual, statusUsuario: "ATIVO" as const };
        store.usuarios[idx] = aprovado;
        const { senha: _senha, ...ret } = aprovado;
        return Promise.resolve({ data: ret } as { data: T });
      }
      const matchRevogar = url.match(/^\/api\/usuarios\/([\w-]+)\/revogar$/);
      if (matchRevogar) {
        const usuarioId = matchRevogar[1];
        const userAtual = getCurrentUserByToken();
        const perfilStorage =
          typeof localStorage !== "undefined" ? (localStorage.getItem("sgi_user_profile") as PerfilUsuario | null) : null;
        const perfilAtual = userAtual?.perfil ?? perfilStorage;
        if (perfilAtual !== "PROPRIETARIA") {
          return Promise.reject(new Error("Apenas a proprietária pode revogar acessos."));
        }
        if (userAtual?.usuarioId === usuarioId) {
          return Promise.reject(new Error("Não é possível revogar o próprio acesso."));
        }
        const idx = store.usuarios.findIndex((u) => u.usuarioId === usuarioId);
        if (idx === -1) return Promise.reject(new Error("Usuário não encontrado."));
        const alvo = store.usuarios[idx];
        if (alvo.perfil === "PROPRIETARIA") {
          return Promise.reject(new Error("Não é possível revogar o acesso de outra proprietária."));
        }
        const revogado = { ...alvo, statusUsuario: "INATIVO" as const };
        store.usuarios[idx] = revogado;
        const { senha: _senha, ...ret } = revogado;
        return Promise.resolve({ data: ret } as { data: T });
      }
      const matchInad = url.match(/^\/api\/inadimplentes\/([\w-]+)$/);
      if (matchInad) {
        const id = matchInad[1];
        const payload = body as { status?: string };
        const idx = store.inadimplentes.findIndex((x) => x.id === id);
        if (idx === -1) return Promise.reject(new Error(`Mock: inadimplência ${id} não encontrada`));
        const atual = store.inadimplentes[idx];
        const atualizado: Inadimplencia = {
          ...atual,
          status: (payload?.status as Inadimplencia["status"]) ?? atual.status,
        };
        store.inadimplentes[idx] = atualizado;
        return Promise.resolve({ data: atualizado } as { data: T });
      }
      const matchCliente = url.match(/^\/api\/clientes\/([\w-]+)$/);
      if (matchCliente) {
        const id = matchCliente[1];
        const payload = body as Partial<Cliente>;
        const idx = store.clientes.findIndex((x) => x.id === id);
        if (idx === -1) return Promise.reject(new Error(`Mock: cliente ${id} não encontrado`));
        const atual = store.clientes[idx];
        const atualizado: Cliente = {
          ...atual,
          ...payload,
          id: atual.id,
        };
        store.clientes[idx] = atualizado;
        return Promise.resolve({ data: atualizado } as { data: T });
      }
      return Promise.reject(new Error(`Mock: rota não encontrada: ${url}`));
    },

    delete(url: string) {
      const matchCliente = url.match(/^\/api\/clientes\/([\w-]+)$/);
      if (matchCliente) {
        const id = matchCliente[1];
        const idx = store.clientes.findIndex((x) => x.id === id);
        if (idx === -1) return Promise.reject(new Error(`Mock: cliente ${id} não encontrado`));
        store.clientes.splice(idx, 1);
        return Promise.resolve({ data: {} } as { data: unknown });
      }
      const matchInad = url.match(/^\/api\/inadimplentes\/([\w-]+)$/);
      if (matchInad) {
        const id = matchInad[1];
        const idx = store.inadimplentes.findIndex((x) => x.id === id);
        if (idx === -1) return Promise.reject(new Error(`Mock: inadimplência ${id} não encontrada`));
        store.inadimplentes.splice(idx, 1);
        return Promise.resolve({ data: {} } as { data: unknown });
      }
      return Promise.reject(new Error(`Mock: rota não encontrada: ${url}`));
    },
  };
}

export const isMockEnabled = () =>
  import.meta.env.VITE_USE_MOCK === "true" || import.meta.env.VITE_USE_MOCK === "1";
