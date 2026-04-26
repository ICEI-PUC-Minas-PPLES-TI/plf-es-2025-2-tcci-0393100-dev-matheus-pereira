package com.pucminas.sgi.util;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * Cálculo de multa e juros conforme regras do negócio:
 * - Multa: 0,33% ao dia sobre o valor da dívida, limitada a 30 dias (máx. 9,99%).
 * - Juros: 2% ao mês sobre o valor já acrescido da multa.
 * - Início: primeiro dia após o vencimento.
 */
public final class MultaJurosUtil {

    /** 0,33% ao dia (pode ser alterado via configuração). */
    private static BigDecimal TAXA_MULTA_DIARIA = new BigDecimal("0.0033");
    /** Máximo 9,99% para multa (pode ser alterado via configuração). */
    private static BigDecimal CAP_MULTA_PERCENTUAL = new BigDecimal("0.0999");
    /** 2% ao mês (pode ser alterado via configuração). */
    private static BigDecimal TAXA_JUROS_MENSAL = new BigDecimal("0.02");
    /** Máximo de dias para aplicação da multa */
    private static final int MAX_DIAS_MULTA = 30;

    private MultaJurosUtil() {}

    /**
     * Atualiza as taxas usadas nos cálculos a partir da configuração persistida.
     */
    public static void configurar(BigDecimal multaDiaria, BigDecimal capMultaPercentual, BigDecimal jurosMensal) {
        if (multaDiaria != null) {
            TAXA_MULTA_DIARIA = multaDiaria;
        }
        if (capMultaPercentual != null) {
            CAP_MULTA_PERCENTUAL = capMultaPercentual;
        }
        if (jurosMensal != null) {
            TAXA_JUROS_MENSAL = jurosMensal;
        }
    }

    /**
     * Calcula multa: 0,33% ao dia sobre o valor principal, limitada a 30 dias (máx. 9,99%).
     * Início no primeiro dia após o vencimento.
     */
    public static BigDecimal calcularMulta(BigDecimal valorPrincipal, LocalDate vencimento, LocalDate dataReferencia) {
        long diasAtraso = ChronoUnit.DAYS.between(vencimento, dataReferencia);
        if (diasAtraso <= 0) return BigDecimal.ZERO;
        int diasParaMulta = (int) Math.min(diasAtraso, MAX_DIAS_MULTA);
        BigDecimal multaPercentual = TAXA_MULTA_DIARIA.multiply(BigDecimal.valueOf(diasParaMulta));
        if (multaPercentual.compareTo(CAP_MULTA_PERCENTUAL) > 0) {
            multaPercentual = CAP_MULTA_PERCENTUAL;
        }
        return valorPrincipal.multiply(multaPercentual).setScale(0, RoundingMode.HALF_UP);
    }

    /**
     * Calcula juros: 2% ao mês sobre (valor principal + multa).
     * Início no primeiro dia após o vencimento.
     */
    public static BigDecimal calcularJuros(BigDecimal valorPrincipal, BigDecimal multa, LocalDate vencimento, LocalDate dataReferencia) {
        long diasAtraso = ChronoUnit.DAYS.between(vencimento, dataReferencia);
        if (diasAtraso <= 0) return BigDecimal.ZERO;
        long mesesAtraso = ChronoUnit.MONTHS.between(vencimento, dataReferencia);
        if (mesesAtraso <= 0) return BigDecimal.ZERO;
        BigDecimal baseJuros = valorPrincipal.add(multa);
        BigDecimal juros = baseJuros.multiply(TAXA_JUROS_MENSAL).multiply(BigDecimal.valueOf(mesesAtraso));
        return juros.setScale(0, RoundingMode.HALF_UP);
    }

    /**
     * Retorna o valor total atualizado: principal + multa + juros.
     * Valores em centavos.
     */
    public static BigDecimal valorTotalComMultaEJuros(BigDecimal valorPrincipal, LocalDate vencimento, LocalDate dataReferencia) {
        BigDecimal multa = calcularMulta(valorPrincipal, vencimento, dataReferencia);
        BigDecimal juros = calcularJuros(valorPrincipal, multa, vencimento, dataReferencia);
        return valorPrincipal.add(multa).add(juros);
    }
}
