import { describe, it, expect, vi } from "vitest";
import { buildMailtoCobrancaUrl, buildGmailComposeUrl, openMailto, openGmailCompose } from "@/lib/mailtoCobranca";
import type { Inadimplencia } from "@/types/api";

describe("buildMailtoCobrancaUrl", () => {
  it("retorna URL mailto sem destinatário quando emailCliente está vazio", () => {
    const item: Inadimplencia = {
      id: "42",
      clienteId: "c1",
      valor: 50000,
      vencimento: "2026-02-28",
    };
    const url = buildMailtoCobrancaUrl(item, "João Silva", "");
    expect(url).toMatch(/^mailto:\?subject=/);
    expect(url).toContain("subject=");
    expect(url).toContain("body=");
    const subjectPart = url.split("&body=")[0];
    expect(decodeURIComponent(subjectPart.replace("mailto:?subject=", ""))).toBe(
      "Cobrança - Débito em Aberto - DIV-20260228-0042"
    );
  });

  it("inclui e-mail do cliente no Para quando informado", () => {
    const item: Inadimplencia = {
      id: "1",
      clienteId: "c1",
      valor: 10000,
      vencimento: "2026-01-15",
    };
    const url = buildMailtoCobrancaUrl(item, "Maria Santos", "maria@email.com");
    expect(url).toMatch(/^mailto:maria@email\.com\?/);
    expect(url).toContain("subject=");
    expect(url).toContain("body=");
  });

  it("assunto contém protocolo no formato DIV-YYYYMMDD-XXXX", () => {
    const item: Inadimplencia = {
      id: "99",
      clienteId: "c1",
      valor: 25000,
      vencimento: "2025-12-31",
    };
    const url = buildMailtoCobrancaUrl(item, "Cliente X");
    const match = url.match(/subject=([^&]+)/);
    expect(match).toBeTruthy();
    const subject = decodeURIComponent(match![1]);
    expect(subject).toBe("Cobrança - Débito em Aberto - DIV-20251231-0099");
  });

  it("corpo contém cliente, valor, vencimento e protocolo", () => {
    const item: Inadimplencia = {
      id: "7",
      clienteId: "c1",
      valor: 150.5,
      vencimento: "2026-03-10",
    };
    const url = buildMailtoCobrancaUrl(item, "Pedro Costa");
    const bodyMatch = url.match(/body=(.+)$/);
    expect(bodyMatch).toBeTruthy();
    const body = decodeURIComponent(bodyMatch![1]);
    expect(body).toContain("Pedro Costa");
    expect(body).toContain("DIV-20260310-0007");
    expect(body).toMatch(/R\$[\s\u00A0]*150,50/);
    expect(body).toContain("10/03/2026");
    expect(body).toContain("Prezado(a),");
    expect(body).toContain("Atenciosamente.");
  });

  it("inclui descrição no corpo quando item tem descricao", () => {
    const item: Inadimplencia = {
      id: "1",
      clienteId: "c1",
      valor: 5000,
      vencimento: "2026-01-20",
      descricao: "Honorários mensais",
    };
    const url = buildMailtoCobrancaUrl(item, "Ana");
    const bodyMatch = url.match(/body=(.+)$/);
    expect(bodyMatch).toBeTruthy();
    const body = decodeURIComponent(bodyMatch![1]);
    expect(body).toContain("Descrição: Honorários mensais");
  });
});

describe("buildGmailComposeUrl", () => {
  it("retorna URL do Gmail com view=cm e parâmetros su e body", () => {
    const item: Inadimplencia = {
      id: "1",
      clienteId: "c1",
      valor: 100,
      vencimento: "2026-01-15",
    };
    const url = buildGmailComposeUrl(item, "Cliente", "cliente@email.com");
    expect(url).toContain("https://mail.google.com/mail/u/2/");
    expect(url).toContain("view=cm");
    expect(url).toContain("fs=1");
    expect(url).toContain("to=cliente%40email.com");
    expect(url).toContain("su=");
    expect(url).toContain("body=");
  });
});

describe("openMailto", () => {
  it("cria âncora com href mailto e dispara clique", () => {
    const createSpy = vi.spyOn(document, "createElement");
    const appendSpy = vi.spyOn(document.body, "appendChild");
    const removeSpy = vi.spyOn(document.body, "removeChild");
    const url = "mailto:test@test.com?subject=Teste";
    openMailto(url);
    expect(createSpy).toHaveBeenCalledWith("a");
    const anchor = createSpy.mock.results[0].value as HTMLAnchorElement;
    expect(anchor.href).toBe(url);
    expect(appendSpy).toHaveBeenCalledWith(anchor);
    expect(removeSpy).toHaveBeenCalledWith(anchor);
    createSpy.mockRestore();
    appendSpy.mockRestore();
    removeSpy.mockRestore();
  });
});

describe("openGmailCompose", () => {
  it("abre window.open com URL e _blank", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const url = "https://mail.google.com/mail/u/2/?view=cm&fs=1";
    openGmailCompose(url);
    expect(openSpy).toHaveBeenCalledWith(url, "_blank", "noopener,noreferrer");
    openSpy.mockRestore();
  });
});
