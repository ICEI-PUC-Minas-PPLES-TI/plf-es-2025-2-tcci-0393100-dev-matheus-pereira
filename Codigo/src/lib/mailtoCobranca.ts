import type { Inadimplencia } from "@/types/api";

function formatarMesAno(iso: string): string {
  if (!iso) return "—";
  const [y, m] = iso.split("T")[0].split("-");
  return `${m}/${y}`;
}

function formatarData(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

function protocolo(id: string | number | undefined, vencimento: string): string {
  const d = (vencimento || "").split("T")[0].replace(/-/g, "");
  const idStr = String(id ?? "").trim();
  return `DIV-${d}-${idStr.length >= 4 ? idStr : idStr.padStart(4, "0")}`;
}

const MAX_BODY_LENGTH = 1500;

/** Base do Gmail para abrir o redator (conta u/2). */
const GMAIL_COMPOSE_BASE = "https://mail.google.com/mail/u/2/?view=cm&fs=1";

function getCobrancaParams(
  item: Inadimplencia,
  nomeCliente: string,
  emailCliente?: string
): { to: string; subjectEncoded: string; bodyEncoded: string } {
  const mesAno = formatarMesAno(item.vencimento);
  const valor = (item.valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const vencimento = formatarData(item.vencimento);
  const prot = protocolo(item.id, item.vencimento);
  const subjectEncoded = encodeURIComponent(`Cobrança - Débito em Aberto - ${prot}`);
  const descricao = (item.descricao || "").trim();
  const linhasBody = [
    "Prezado(a),",
    "",
    `Segue cobrança referente ao débito em aberto (${mesAno}).`,
    "",
    `Cliente: ${nomeCliente}`,
    `Protocolo: ${prot}`,
    `Vencimento: ${vencimento}`,
    `Valor: ${valor}`,
    ...(descricao ? ["", `Descrição: ${descricao}`] : []),
    "",
    "Atenciosamente.",
  ];
  const bodyRaw = linhasBody.join("\n");
  const bodyEncoded = encodeURIComponent(
    bodyRaw.length > MAX_BODY_LENGTH ? bodyRaw.slice(0, MAX_BODY_LENGTH) + "..." : bodyRaw
  );
  const to = (emailCliente || "").trim();
  return { to, subjectEncoded, bodyEncoded };
}

const COR_PRINCIPAL = "#A43F9B";
const COR_VENCIMENTO = "#dc2626";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Gera o HTML do e-mail de cobrança no layout da arte (cabeçalho roxo, caixa de detalhes, assinatura).
 */
export function buildCobrancaEmailHtml(
  item: Inadimplencia,
  nomeCliente: string
): string {
  const mesAno = formatarMesAno(item.vencimento);
  const valor = (item.valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const vencimento = formatarData(item.vencimento);
  const prot = protocolo(item.id, item.vencimento);
  const descricao = (item.descricao || "").trim();

  return (
    '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;font-family:Arial,sans-serif;background:#fff;">' +
    '<div style="max-width:600px;margin:0 auto;">' +
    `<div style="background:${COR_PRINCIPAL};color:#fff;padding:24px 20px;text-align:center;">` +
    '<div style="font-size:12px;opacity:0.9;margin-bottom:4px;">Contabilidade São Judas Tadeu</div>' +
    '<div style="font-size:22px;font-weight:bold;">Contabilidade São Judas Tadeu</div>' +
    '<div style="font-size:13px;margin-top:6px;">Sistema de Gerenciamento de Inadimplentes</div>' +
    "</div>" +
    '<div style="padding:24px 20px;background:#fff;">' +
    `<p style="margin:0 0 16px;font-size:16px;font-weight:bold;color:${COR_PRINCIPAL};">Cobrança - Débito em Aberto</p>` +
    '<p style="margin:0 0 12px;font-size:15px;color:#333;">Prezado(a),</p>' +
    `<p style="margin:0 0 20px;font-size:15px;color:#333;">Segue cobrança referente ao débito em aberto (${escapeHtml(mesAno)}).</p>` +
    `<div style="background:#f8fafc;border-left:4px solid ${COR_PRINCIPAL};padding:16px 20px;margin-bottom:20px;">` +
    `<p style="margin:0 0 8px;font-size:14px;color:#333;"><strong>Cliente:</strong> ${escapeHtml(nomeCliente)}</p>` +
    `<p style="margin:0 0 8px;font-size:14px;color:#333;"><strong>Protocolo:</strong> ${escapeHtml(prot)}</p>` +
    `<p style="margin:0 0 8px;font-size:14px;color:#333;"><strong>Vencimento:</strong> <span style="color:${COR_VENCIMENTO};font-weight:bold;">${escapeHtml(vencimento)}</span></p>` +
    `<p style="margin:0;font-size:14px;color:#333;"><strong>Valor:</strong> <span style="color:${COR_PRINCIPAL};font-weight:bold;">${escapeHtml(valor)}</span></p>` +
    (descricao ? `<p style="margin:12px 0 0;font-size:14px;color:#333;"><strong>Descrição:</strong> ${escapeHtml(descricao)}</p>` : "") +
    "</div>" +
    '<p style="margin:0 0 8px;font-size:15px;color:#333;">Atenciosamente,</p>' +
    `<p style="margin:0;font-size:15px;color:${COR_PRINCIPAL};font-weight:600;">Equipe Contabilidade São Judas Tadeu</p>` +
    "</div></div></body></html>"
  );
}

/**
 * Copia o e-mail de cobrança (HTML) para a área de transferência. Retorna true se ok.
 */
export async function copyCobrancaEmailToClipboard(
  item: Inadimplencia,
  nomeCliente: string
): Promise<boolean> {
  const html = buildCobrancaEmailHtml(item, nomeCliente);
  const plain =
    `Prezado(a),\n\nSegue cobrança referente ao débito em aberto.\n\nCliente: ${nomeCliente}\nProtocolo: ${protocolo(item.id, item.vencimento)}\nVencimento: ${formatarData(item.vencimento)}\nValor: ${(item.valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}\n\nAtenciosamente,\nEquipe Contabilidade São Judas Tadeu`;
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([plain], { type: "text/plain" }),
      }),
    ]);
    return true;
  } catch {
    try {
      await navigator.clipboard.writeText(plain);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Monta a URL mailto: para cobrança (Para, Assunto e Corpo).
 * Usada pelo botão "Enviar e-mail de cobrança" e testável em unit tests.
 */
export function buildMailtoCobrancaUrl(
  item: Inadimplencia,
  nomeCliente: string,
  emailCliente?: string
): string {
  const { to, subjectEncoded, bodyEncoded } = getCobrancaParams(item, nomeCliente, emailCliente);
  return to
    ? `mailto:${to}?subject=${subjectEncoded}&body=${bodyEncoded}`
    : `mailto:?subject=${subjectEncoded}&body=${bodyEncoded}`;
}

/**
 * Monta a URL do Gmail (conta u/2) para redigir e-mail de cobrança com Para, Assunto e opcionalmente Corpo.
 * @param semCorpo quando true, não inclui body (para o usuário colar o HTML copiado).
 */
export function buildGmailComposeUrl(
  item: Inadimplencia,
  nomeCliente: string,
  emailCliente?: string,
  semCorpo?: boolean
): string {
  const { to, subjectEncoded, bodyEncoded } = getCobrancaParams(item, nomeCliente, emailCliente);
  const params = new URLSearchParams({ su: decodeURIComponent(subjectEncoded) });
  if (!semCorpo) params.set("body", decodeURIComponent(bodyEncoded));
  if (to) params.set("to", to);
  return `${GMAIL_COMPOSE_BASE}&${params.toString()}`;
}

/**
 * Abre a URL mailto no cliente de e-mail padrão (cria <a>, click, remove).
 */
export function openMailto(url: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener noreferrer";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Abre o Gmail (conta u/2) em nova aba com o e-mail de cobrança pré-preenchido.
 */
export function openGmailCompose(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}
