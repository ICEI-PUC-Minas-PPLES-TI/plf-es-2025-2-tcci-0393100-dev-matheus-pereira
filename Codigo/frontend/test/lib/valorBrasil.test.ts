import { describe, it, expect } from "vitest";
import { parseValorReais, formatarCentavosParaInput } from "@/lib/valorBrasil";

describe("parseValorReais", () => {
  it("retorna 0 para string vazia ou só espaços", () => {
    expect(parseValorReais("")).toBe(0);
    expect(parseValorReais("   ")).toBe(0);
  });

  it("interpreta formato BR: ponto = milhar, vírgula = decimal", () => {
    expect(parseValorReais("1.000,00")).toBe(1000);
    expect(parseValorReais("1.000")).toBe(1000);
    expect(parseValorReais("2.500,50")).toBe(2500.5);
    expect(parseValorReais("150,50")).toBe(150.5);
  });

  it("interpreta valor sem vírgula com um ponto como decimal (ex.: 150.50)", () => {
    expect(parseValorReais("150.50")).toBe(150.5);
    expect(parseValorReais("200")).toBe(200);
  });

  it("interpreta múltiplos pontos sem vírgula como milhar (ex.: 1.000.000)", () => {
    expect(parseValorReais("1.000.000")).toBe(1000000);
  });

  it("remove caracteres não numéricos exceto ponto e vírgula", () => {
    expect(parseValorReais("R$ 1.000,00")).toBe(1000);
    expect(parseValorReais("  200,50  ")).toBe(200.5);
  });

  it("evita bug de interpretar 1.000,00 como 1 (um real)", () => {
    expect(parseValorReais("1.000,00")).toBe(1000);
    expect(parseValorReais("1.000")).toBe(1000);
  });
});

describe("formatarCentavosParaInput", () => {
  it("retorna string vazia para null, undefined ou 0", () => {
    expect(formatarCentavosParaInput(null)).toBe("");
    expect(formatarCentavosParaInput(undefined)).toBe("");
    expect(formatarCentavosParaInput(0)).toBe("");
  });

  it("formata centavos em reais no padrão pt-BR com duas casas", () => {
    expect(formatarCentavosParaInput(20000)).toBe("200,00");
    expect(formatarCentavosParaInput(100000)).toBe("1.000,00");
    expect(formatarCentavosParaInput(15050)).toBe("150,50");
  });
});
