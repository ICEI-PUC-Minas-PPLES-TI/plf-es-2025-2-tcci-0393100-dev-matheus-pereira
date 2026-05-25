import { describe, it, expect } from "vitest";
import {
  normalizeClienteFromApi,
  normalizeClienteToApi,
  normalizeInadimplenciaFromApi,
  normalizeInadimplenciaToApi,
  normalizeRankingFromApi,
  normalizeInadimplenciaPeriodoFromApi,
  normalizeResumoRelatorioFromApi,
} from "@/lib/apiNormalizers";

describe("normalizeClienteFromApi", () => {
  it("mapeia campos do backend para Cliente (id, nome, situacao)", () => {
    const raw = { id: "u1", nome: "João", statusCliente: "ATIVO" };
    const c = normalizeClienteFromApi(raw);
    expect(c.id).toBe("u1");
    expect(c.nome).toBe("João");
    expect(c.situacao).toBe("Ativo");
  });

  it("aceita clienteId quando id não vem", () => {
    const raw = { clienteId: "c2", nome: "Maria", statusCliente: "INADIMPLENTE" };
    const c = normalizeClienteFromApi(raw);
    expect(c.id).toBe("c2");
    expect(c.situacao).toBe("Inadimplente");
  });

  it("mapeia criadoEm/atualizadoEm para createdAt/updatedAt", () => {
    const raw = { nome: "X", criadoEm: "2025-01-01", atualizadoEm: "2025-01-02" };
    const c = normalizeClienteFromApi(raw);
    expect(c.createdAt).toBe("2025-01-01");
    expect(c.updatedAt).toBe("2025-01-02");
  });

  it("usa cpfCnpj quando cpf não vem", () => {
    const raw = { nome: "Y", cpfCnpj: "12345678900" };
    const c = normalizeClienteFromApi(raw);
    expect(c.cpf).toBe("12345678900");
  });

  it("mapeia telefone fixo e celular", () => {
    const raw = { nome: "Z", telefone: "1133334444", celular: "11999998888" };
    const c = normalizeClienteFromApi(raw);
    expect(c.telefone).toBe("1133334444");
    expect(c.celular).toBe("11999998888");
  });
});

describe("normalizeClienteToApi", () => {
  it("converte situacao para statusCliente em maiúsculas", () => {
    const payload = normalizeClienteToApi({ nome: "A", situacao: "Inadimplente" });
    expect(payload.statusCliente).toBe("INADIMPLENTE");
  });

  it("envia cpfCnpj só com dígitos", () => {
    const payload = normalizeClienteToApi({ nome: "B", cpf: "123.456.789-00" });
    expect(payload.cpfCnpj).toBe("12345678900");
  });

  it("envia telefone e celular só com dígitos", () => {
    const payload = normalizeClienteToApi({
      nome: "C",
      telefone: "(11) 3333-4444",
      celular: "(11) 99999-8888",
    });
    expect(payload.telefone).toBe("1133334444");
    expect(payload.celular).toBe("11999998888");
  });
});

describe("normalizeInadimplenciaFromApi", () => {
  it("mantém valor em reais (sem conversão de centavos)", () => {
    const raw = { clienteId: "c1", valor: 150.5, vencimento: "2026-01-10" };
    const i = normalizeInadimplenciaFromApi(raw);
    expect(i.valor).toBe(150.5);
  });

  it("preenche id, clienteNome, descricao e status", () => {
    const raw = {
      id: "d1",
      clienteId: "c1",
      clienteNome: "Cliente X",
      valor: 100,
      vencimento: "2026-02-01",
      descricao: "Mensalidade",
      status: "EmAberto",
    };
    const i = normalizeInadimplenciaFromApi(raw);
    expect(i.id).toBe("d1");
    expect(i.clienteNome).toBe("Cliente X");
    expect(i.descricao).toBe("Mensalidade");
    expect(i.status).toBe("EmAberto");
    expect(i.valor).toBe(100);
  });
});

describe("normalizeInadimplenciaToApi", () => {
  it("envia valor em reais (sem multiplicar por 100)", () => {
    const payload = normalizeInadimplenciaToApi({
      clienteId: "c1",
      valor: 199.9,
      vencimento: "2026-03-15",
    });
    expect(payload.valor).toBe(199.9);
  });

  it("inclui descricao quando informada", () => {
    const payload = normalizeInadimplenciaToApi({
      clienteId: "c1",
      valor: 100,
      vencimento: "2026-01-01",
      descricao: "Honorários",
    });
    expect(payload.descricao).toBe("Honorários");
  });
});

describe("normalizeRankingFromApi", () => {
  it("retorna array vazio quando data não tem ranking", () => {
    expect(normalizeRankingFromApi(null)).toEqual([]);
    expect(normalizeRankingFromApi({})).toEqual([]);
    expect(normalizeRankingFromApi({ outro: [] })).toEqual([]);
  });

  it("mapeia ranking com nomeCliente e saldoDevedor", () => {
    const data = {
      ranking: [
        { clienteId: "c1", nomeCliente: "João", saldoDevedor: 5000 },
        { clienteId: "c2", clienteNome: "Maria", valorDevido: 3000 },
      ],
    };
    const list = normalizeRankingFromApi(data);
    expect(list).toHaveLength(2);
    expect(list[0].clienteNome).toBe("João");
    expect(list[0].valorDevido).toBe(5000);
    expect(list[1].clienteNome).toBe("Maria");
    expect(list[1].valorDevido).toBe(3000);
  });
});

describe("normalizeInadimplenciaPeriodoFromApi", () => {
  it("retorna null quando data inválido", () => {
    expect(normalizeInadimplenciaPeriodoFromApi(null)).toBeNull();
    expect(normalizeInadimplenciaPeriodoFromApi("string")).toBeNull();
  });

  it("mapeia periodoInicio, periodoFim e totalClientesInadimplentes", () => {
    const data = {
      periodoInicio: "2025-01-01",
      periodoFim: "2025-01-31",
      totalClientesInadimplentes: 10,
      valorTotalInadimplente: 50000,
      itens: [],
    };
    const r = normalizeInadimplenciaPeriodoFromApi(data);
    expect(r).not.toBeNull();
    expect(r!.dataInicio).toBe("2025-01-01");
    expect(r!.dataFim).toBe("2025-01-31");
    expect(r!.totalClientes).toBe(10);
    expect(r!.valorTotal).toBe(50000);
  });
});

describe("normalizeResumoRelatorioFromApi", () => {
  it("retorna null quando data inválido", () => {
    expect(normalizeResumoRelatorioFromApi(null)).toBeNull();
  });

  it("mantém valores monetários em reais (sem dividir por 100)", () => {
    const r = normalizeResumoRelatorioFromApi({
      totalClientes: 195,
      totalDividas: 1,
      totalEmAberto: 2500,
      totalPago: 16.6,
    });
    expect(r).toEqual({
      totalClientes: 195,
      totalDividas: 1,
      totalEmAberto: 2500,
      totalPago: 16.6,
    });
  });

  it("aceita totalRecebido como alias de totalPago", () => {
    const r = normalizeResumoRelatorioFromApi({
      totalClientes: 1,
      totalDividas: 1,
      totalEmAberto: 100,
      totalRecebido: 50,
    });
    expect(r?.totalPago).toBe(50);
  });
});
