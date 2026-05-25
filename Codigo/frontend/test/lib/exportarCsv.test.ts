import { describe, expect, it } from "vitest";
import { escapeCsvCell } from "@/lib/exportarCsv";

describe("escapeCsvCell", () => {
  it("retorna texto simples sem aspas", () => {
    expect(escapeCsvCell("Maria")).toBe("Maria");
  });

  it("escapa ponto e vírgula e aspas", () => {
    expect(escapeCsvCell('a;b')).toBe('"a;b"');
    expect(escapeCsvCell('diz "oi"')).toBe('"diz ""oi"""');
  });

  it("escapa quebras de linha", () => {
    expect(escapeCsvCell("linha1\nlinha2")).toBe('"linha1\nlinha2"');
  });
});
