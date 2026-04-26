package com.pucminas.sgi.util;

import java.time.LocalDate;

/**
 * Utilitário para data de vencimento padrão (dia 4 do mês).
 */
public final class VencimentoUtil {

    /** Dia do mês usado como vencimento padrão. */
    public static final int DIA_VENCIMENTO_PADRAO = 4;

    private VencimentoUtil() {}

    /**
     * Retorna a data de vencimento padrão: dia 4 do mês.
     * Se hoje for dia 1 a 4, retorna o dia 4 do mês atual.
     * Se hoje for dia 5 em diante, retorna o dia 4 do mês seguinte.
     */
    public static LocalDate getVencimentoPadrao() {
        LocalDate hoje = LocalDate.now();
        if (hoje.getDayOfMonth() <= DIA_VENCIMENTO_PADRAO) {
            return LocalDate.of(hoje.getYear(), hoje.getMonth(), DIA_VENCIMENTO_PADRAO);
        }
        return LocalDate.of(hoje.getYear(), hoje.getMonth(), DIA_VENCIMENTO_PADRAO).plusMonths(1);
    }
}
