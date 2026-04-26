package com.pucminas.sgi.util;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;

/**
 * Alíquotas e constantes da Reforma Tributária (CBS/IBS).
 * Valores estimados – aguardar definição final por Lei Complementar.
 */
public final class AliquotasReformaTributaria {

    private AliquotasReformaTributaria() {}

    private static final int SCALE = 6;
    private static final RoundingMode ROUND = RoundingMode.HALF_UP;

    /** Regime pleno: CBS 8,8%, IBS 17,9%, total 26,7%. */
    public static final BigDecimal CBS_PLENO = new BigDecimal("0.088");
    public static final BigDecimal IBS_PLENO = new BigDecimal("0.179");
    public static final BigDecimal TOTAL_PLENO = CBS_PLENO.add(IBS_PLENO);

    /** Regime reduzido (50%): saúde, educação, transporte público, etc. */
    public static final BigDecimal CBS_REDUZIDO = new BigDecimal("0.044");
    public static final BigDecimal IBS_REDUZIDO = new BigDecimal("0.0895");
    public static final BigDecimal TOTAL_REDUZIDO = new BigDecimal("0.1335");

    /** Alíquota zero: cesta básica, medicamentos específicos, etc. */
    public static final BigDecimal ZERO = BigDecimal.ZERO;

    /** Teto de referência (IVA). */
    public static final BigDecimal ALIQUOTA_MAXIMA_REFERENCIA = new BigDecimal("0.27");

    /** Percentual do novo regime por ano (transição 2026–2033). */
    private static final Map<Integer, BigDecimal> TRANSICAO = Map.of(
            2026, new BigDecimal("0.10"),
            2027, new BigDecimal("0.20"),
            2028, new BigDecimal("0.30"),
            2029, new BigDecimal("0.40"),
            2030, new BigDecimal("0.60"),
            2031, new BigDecimal("0.80"),
            2032, new BigDecimal("0.90"),
            2033, BigDecimal.ONE
    );

    public static BigDecimal getPercentualTransicao(int ano) {
        return TRANSICAO.getOrDefault(ano, BigDecimal.ZERO);
    }

    public static BigDecimal getCbs(String categoria) {
        return switch (categoria != null ? categoria.toUpperCase() : "PLENO") {
            case "REDUZIDO" -> CBS_REDUZIDO;
            case "ZERO" -> ZERO;
            default -> CBS_PLENO;
        };
    }

    public static BigDecimal getIbs(String categoria) {
        return switch (categoria != null ? categoria.toUpperCase() : "PLENO") {
            case "REDUZIDO" -> IBS_REDUZIDO;
            case "ZERO" -> ZERO;
            default -> IBS_PLENO;
        };
    }

    public static BigDecimal getTotal(String categoria) {
        return switch (categoria != null ? categoria.toUpperCase() : "PLENO") {
            case "REDUZIDO" -> TOTAL_REDUZIDO;
            case "ZERO" -> ZERO;
            default -> TOTAL_PLENO;
        };
    }

    public static BigDecimal scale(BigDecimal value) {
        return value.setScale(SCALE, ROUND);
    }

    public static BigDecimal scale2(BigDecimal value) {
        return value.setScale(2, ROUND);
    }
}
