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

const PIX_CODE =
  "00020126360014br.gov.bcb.pix0114+55319982313435204000053039865802BR5922MCA SERVICOS CONTABEIS6015Conceicao do Ma610935860-000622905250JUH02173447164451724462563048D28";
const PIX_INFO = {
  beneficiario: "MCA Serviços Contábeis",
  cidade: "Conceição do Mato Dentro",
  chave: "+55 31 99823-1343",
  banco: "Sicoob",
};

/** Base do Gmail para abrir o redator (conta u/2). */
const GMAIL_COMPOSE_BASE = "https://mail.google.com/mail/u/2/?view=cm&fs=1";

function getCobrancaParams(
  item: Inadimplencia,
  nomeCliente: string,
  emailCliente?: string
): { to: string; subjectEncoded: string; bodyEncoded: string } {
  const mesAno = formatarMesAno(item.vencimento);
  const valor = (item.valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const juros = (item.juros ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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
    `Juros: ${juros}`,
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

/** Texto plano da cobrança (e-mail, WhatsApp, clipboard). */
export function buildCobrancaMensagemTexto(
  item: Inadimplencia,
  nomeCliente: string,
  stripePaymentLinkUrl?: string | null
): string {
  const mesAno = formatarMesAno(item.vencimento);
  const valor = (item.valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const juros = (item.juros ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const vencimento = formatarData(item.vencimento);
  const prot = protocolo(item.id, item.vencimento);
  const descricao = (item.descricao || "").trim();
  const linkPagamento =
    typeof stripePaymentLinkUrl === "string" && /^https:\/\//i.test(stripePaymentLinkUrl.trim())
      ? stripePaymentLinkUrl.trim()
      : null;

  const linhas = [
    "Prezado(a),",
    "",
    `Segue cobrança referente ao débito em aberto (${mesAno}).`,
    "",
    `Cliente: ${nomeCliente}`,
    `Protocolo: ${prot}`,
    `Vencimento: ${vencimento}`,
    `Juros: ${juros}`,
    `Valor: ${valor}`,
    ...(descricao ? [`Descrição: ${descricao}`] : []),
    ...(linkPagamento ? ["", "Pagamento online (Boleto/Pix):", linkPagamento] : []),
    "",
    `Pagamento via Pix (${PIX_INFO.banco}):`,
    `Chave: ${PIX_INFO.chave}`,
    "Pix Copia e Cola:",
    PIX_CODE,
    "",
    "Atenciosamente,",
    "Equipe Contabilidade São Judas Tadeu",
  ];
  return linhas.join("\n");
}

/** Normaliza telefone brasileiro para wa.me (apenas dígitos, com DDI 55). */
export function normalizeTelefoneParaWhatsApp(telefone?: string | null): string {
  const digits = (telefone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  const local = digits.replace(/^0+/, "");
  if (local.length === 10 || local.length === 11) return `55${local}`;
  if (local.length >= 12) return local;
  return "";
}

/** URL do WhatsApp com mensagem de cobrança pré-preenchida. */
export function buildWhatsAppCobrancaUrl(
  item: Inadimplencia,
  nomeCliente: string,
  telefoneCliente?: string | null,
  stripePaymentLinkUrl?: string | null
): string {
  const phone = normalizeTelefoneParaWhatsApp(telefoneCliente);
  const text = encodeURIComponent(buildCobrancaMensagemTexto(item, nomeCliente, stripePaymentLinkUrl));
  if (phone) return `https://wa.me/${phone}?text=${text}`;
  return `https://api.whatsapp.com/send?text=${text}`;
}

export function openWhatsAppCobranca(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}

const COR_PRINCIPAL = "#A43F9B";
const COR_VENCIMENTO = "#dc2626";

function buildPixQrCodeImageUrl(code: string, size = 220): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(code)}&bgcolor=ffffff&color=1a1a2e&qzone=1`;
}

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
  nomeCliente: string,
  stripePaymentLinkUrl?: string | null
): string {
  const mesAno = formatarMesAno(item.vencimento);
  const valor = (item.valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const juros = (item.juros ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const vencimento = formatarData(item.vencimento);
  const prot = protocolo(item.id, item.vencimento);
  const descricao = (item.descricao || "").trim();
  const linkPagamento =
    typeof stripePaymentLinkUrl === "string" && /^https:\/\//i.test(stripePaymentLinkUrl.trim())
      ? stripePaymentLinkUrl.trim()
      : null;
  const linkPagamentoEscapado = linkPagamento ? escapeHtml(linkPagamento) : "";
  const pixQrUrl = PIX_CODE ? buildPixQrCodeImageUrl(PIX_CODE) : "";

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
    `<p style="margin:0 0 8px;font-size:14px;color:#333;"><strong>Juros:</strong> <span style="color:${COR_PRINCIPAL};font-weight:bold;">${escapeHtml(juros)}</span></p>` +
    `<p style="margin:0;font-size:14px;color:#333;"><strong>Valor:</strong> <span style="color:${COR_PRINCIPAL};font-weight:bold;">${escapeHtml(valor)}</span></p>` +
    (descricao ? `<p style="margin:12px 0 0;font-size:14px;color:#333;"><strong>Descrição:</strong> ${escapeHtml(descricao)}</p>` : "") +
    "</div>" +
    (linkPagamento
      ? `<div style="background:#f8fafc;border-left:4px solid ${COR_PRINCIPAL};padding:16px 20px;margin:0 0 20px;">` +
        `<p style="margin:0 0 10px;font-size:16px;font-weight:bold;color:${COR_PRINCIPAL};">Pagamento online</p>` +
        '<p style="margin:0 0 14px;font-size:14px;color:#333;">Clique no botão abaixo para pagar com Boleto ou Pix.</p>' +
        `<p style="margin:0 0 12px;"><a href="${linkPagamentoEscapado}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:${COR_PRINCIPAL};color:#fff;text-decoration:none;font-weight:bold;font-size:14px;padding:10px 16px;border-radius:4px;">Pagar com Boleto ou Pix</a></p>` +
        `<p style="margin:0;font-size:12px;color:#555;word-break:break-all;">Se o botão não abrir, copie e cole este link no navegador:<br><a href="${linkPagamentoEscapado}" target="_blank" rel="noopener noreferrer" style="color:${COR_PRINCIPAL};">${linkPagamentoEscapado}</a></p>` +
        "</div>"
      : "") +
    (pixQrUrl
      ? `<div style="background:#f8fafc;border-left:4px solid ${COR_PRINCIPAL};padding:16px 20px;margin:0 0 20px;">` +
        `<p style="margin:0 0 10px;font-size:16px;font-weight:bold;color:${COR_PRINCIPAL};">Pagamento via Pix</p>` +
        `<p style="margin:0 0 10px;font-size:13px;color:#555;">${escapeHtml(PIX_INFO.banco)} · ${escapeHtml(PIX_INFO.beneficiario)}</p>` +
        '<p style="margin:0 0 12px;font-size:14px;color:#333;">Escaneie o QR Code abaixo para realizar o pagamento via Pix.</p>' +
        `<p style="margin:0 0 12px;"><img src="${escapeHtml(pixQrUrl)}" alt="QR Code Pix" style="max-width:260px;width:100%;height:auto;border:1px solid #e5e7eb;border-radius:6px;" /></p>` +
        '<p style="margin:0 0 6px;font-size:13px;color:#333;"><strong>Pix Copia e Cola:</strong></p>' +
        `<p style="margin:0;font-size:12px;color:#555;word-break:break-all;">${escapeHtml(PIX_CODE)}</p>` +
        "</div>"
      : '<p style="margin:0 0 20px;font-size:13px;color:#666;">Pagamento via Pix disponível sob solicitação.</p>') +
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
  nomeCliente: string,
  stripePaymentLinkUrl?: string | null
): Promise<boolean> {
  const html = buildCobrancaEmailHtml(item, nomeCliente, stripePaymentLinkUrl);
  const plain = buildCobrancaMensagemTexto(item, nomeCliente, stripePaymentLinkUrl);
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
