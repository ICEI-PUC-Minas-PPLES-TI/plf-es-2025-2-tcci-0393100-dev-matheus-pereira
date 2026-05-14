package com.pucminas.sgi.util;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

/**
 * Monta o HTML do e-mail de cobrança (layout alinhado ao modelo institucional do sistema).
 */
public final class CobrancaEmailHtmlBuilder {

    private static final String ROXO = "#6B46C1";
    private static final String ROXO_ESCURO = "#5B21B6";
    private static final DateTimeFormatter DF_BR = DateTimeFormatter.ofPattern("dd/MM/yyyy", Locale.of("pt", "BR"));
    private static final DateTimeFormatter REF_MES = DateTimeFormatter.ofPattern("MM/yyyy", Locale.of("pt", "BR"));

    private CobrancaEmailHtmlBuilder() {}

    public static String esc(String s) {
        if (s == null || s.isEmpty()) {
            return "";
        }
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    public static String formatarReais(BigDecimal valor) {
        BigDecimal v = valor == null ? BigDecimal.ZERO : valor.setScale(2, RoundingMode.HALF_UP);
        return NumberFormat.getCurrencyInstance(Locale.forLanguageTag("pt-BR")).format(v);
    }

    public static BigDecimal centavosParaReais(BigDecimal centavos) {
        if (centavos == null) {
            return BigDecimal.ZERO;
        }
        return centavos.divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    /**
     * Cobrança de uma única dívida — mesmo esqueleto visual do modelo usado no escritório.
     */
    public static String htmlCobrancaDividaUnica(String nomeEscritorio,
                                                 String nomeCliente,
                                                 String protocolo,
                                                 LocalDate vencimento,
                                                 BigDecimal jurosReais,
                                                 BigDecimal valorTotalReais) {
        Objects.requireNonNull(nomeEscritorio);
        String mesRef = vencimento != null ? REF_MES.format(vencimento) : "--";
        String ven = vencimento != null ? DF_BR.format(vencimento) : "-";
        String jurosStr = formatarReais(jurosReais);
        String valorStr = formatarReais(valorTotalReais);

        return """
                <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width"/></head>
                <body style="margin:0;padding:0;background:#ececf1;">
                <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr><td align="center" style="padding:28px 12px;">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%%;background:#ffffff;border-radius:10px;overflow:hidden;border-collapse:collapse;box-shadow:0 2px 8px rgba(0,0,0,.06);">
                <tr><td align="center" style="background:%s;padding:28px 20px;font-family:Segoe UI,Arial,sans-serif;">
                <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;line-height:1.25;">%s</h1>
                <p style="margin:10px 0 0;font-size:14px;color:#ede9fe;line-height:1.4;">Sistema de Gerenciamento de Inadimplentes</p>
                </td></tr>
                <tr><td style="padding:26px 28px 32px;font-family:Segoe UI,Arial,sans-serif;font-size:15px;color:#111827;line-height:1.55;">
                <h2 style="margin:0 0 18px;font-size:18px;font-weight:700;color:%s;">Cobrança - Débito em Aberto</h2>
                <p style="margin:0 0 10px;">Prezado(a),</p>
                <p style="margin:0 0 22px;">Segue cobrança referente ao débito em aberto (%s).</p>
                <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;border-left:5px solid %s;border-radius:4px;">
                <tr><td style="padding:18px 20px;">
                <p style="margin:0 0 10px;"><strong>Cliente:</strong> %s</p>
                <p style="margin:0 0 10px;"><strong>Protocolo:</strong> %s</p>
                <p style="margin:0 0 10px;"><strong>Vencimento:</strong> <span style="color:#dc2626;font-weight:600;">%s</span></p>
                <p style="margin:0 0 10px;"><strong>Juros:</strong> <span style="color:%s;font-weight:600;">%s</span></p>
                <p style="margin:0;"><strong>Valor:</strong> <span style="color:%s;font-weight:700;font-size:17px;">%s</span></p>
                </td></tr></table>
                <p style="margin:28px 0 8px;">Atenciosamente,</p>
                <p style="margin:0;font-weight:700;color:%s;">Equipe %s</p>
                </td></tr></table></td></tr></table></body></html>
                """.formatted(
                ROXO,
                esc(nomeEscritorio),
                ROXO_ESCURO,
                esc(mesRef),
                ROXO,
                esc(nomeCliente),
                esc(protocolo),
                esc(ven),
                ROXO_ESCURO,
                esc(jurosStr),
                ROXO_ESCURO,
                esc(valorStr),
                ROXO_ESCURO,
                esc(nomeEscritorio)
        );
    }

    public record LinhaResumo(String protocolo, LocalDate vencimento, BigDecimal valorReais) {}

    /**
     * Cobrança agregada (várias dívidas).
     */
    public static String htmlCobrancaAgregada(String nomeEscritorio,
                                             String nomeCliente,
                                             List<LinhaResumo> linhas,
                                             BigDecimal jurosTotalReais,
                                             BigDecimal valorTotalReais) {
        Objects.requireNonNull(nomeEscritorio);
        StringBuilder linhasHtml = new StringBuilder();
        for (LinhaResumo l : linhas) {
            String ven = l.vencimento() != null ? DF_BR.format(l.vencimento()) : "-";
            linhasHtml.append("<p style=\"margin:0 0 8px;\"><strong>")
                    .append(esc(l.protocolo())).append("</strong> — venc. ").append(esc(ven))
                    .append(" — ").append(esc(formatarReais(l.valorReais()))).append("</p>");
        }
        String mesRef = linhas.isEmpty() || linhas.getFirst().vencimento() == null
                ? "--" : REF_MES.format(linhas.getFirst().vencimento());

        StringBuilder out = new StringBuilder();
        out.append("<!DOCTYPE html><html lang=\"pt-BR\"><head><meta charset=\"UTF-8\"/></head>");
        out.append("<body style=\"margin:0;padding:0;background:#ececf1;\">");
        out.append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr><td align=\"center\" style=\"padding:28px 12px;\">");
        out.append("<table role=\"presentation\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;\">");
        out.append("<tr><td align=\"center\" style=\"background:").append(ROXO).append(";padding:28px 20px;font-family:Segoe UI,Arial,sans-serif;\">");
        out.append("<h1 style=\"margin:0;font-size:22px;color:#ffffff;\">").append(esc(nomeEscritorio)).append("</h1>");
        out.append("<p style=\"margin:10px 0 0;font-size:14px;color:#ede9fe;\">Sistema de Gerenciamento de Inadimplentes</p>");
        out.append("</td></tr>");
        out.append("<tr><td style=\"padding:26px 28px 32px;font-family:Segoe UI,Arial,sans-serif;font-size:15px;color:#111827;\">");
        out.append("<h2 style=\"margin:0 0 18px;color:").append(ROXO_ESCURO).append(";\">Cobrança - Débitos em Aberto</h2>");
        out.append("<p style=\"margin:0 0 10px;\">Prezado(a) ").append(esc(nomeCliente)).append(",</p>");
        out.append("<p style=\"margin:0 0 22px;\">Segue cobrança referente aos débitos em aberto (").append(esc(mesRef)).append(").</p>");
        out.append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f3f4f6;border-left:5px solid ")
                .append(ROXO).append(";border-radius:4px;\"><tr><td style=\"padding:18px 20px;\">");
        out.append("<p style=\"margin:0 0 14px;font-weight:700;color:").append(ROXO_ESCURO).append(";\">Resumo dos débitos</p>");
        out.append(linhasHtml);
        out.append("<p style=\"margin:16px 0 8px;\"><strong>Juros (total estimado):</strong> <span style=\"color:")
                .append(ROXO_ESCURO).append(";font-weight:600;\">").append(esc(formatarReais(jurosTotalReais))).append("</span></p>");
        out.append("<p style=\"margin:0;\"><strong>Valor total:</strong> <span style=\"color:").append(ROXO_ESCURO)
                .append(";font-weight:700;font-size:17px;\">").append(esc(formatarReais(valorTotalReais))).append("</span></p>");
        out.append("</td></tr></table>");
        out.append("<p style=\"margin:28px 0 8px;\">Atenciosamente,</p>");
        out.append("<p style=\"margin:0;font-weight:700;color:").append(ROXO_ESCURO).append(";\">Equipe ")
                .append(esc(nomeEscritorio)).append("</p>");
        out.append("</td></tr></table></td></tr></table></body></html>");
        return out.toString();
    }
}
