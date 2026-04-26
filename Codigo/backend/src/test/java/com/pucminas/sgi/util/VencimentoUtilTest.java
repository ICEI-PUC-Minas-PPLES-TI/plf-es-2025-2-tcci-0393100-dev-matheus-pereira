package com.pucminas.sgi.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Testes unitários para VencimentoUtil.
 */
@DisplayName("VencimentoUtil")
class VencimentoUtilTest {

    @Test
    @DisplayName("DIA_VENCIMENTO_PADRAO é 4")
    void constanteDiaVencimento() {
        assertEquals(4, VencimentoUtil.DIA_VENCIMENTO_PADRAO);
    }

    @Test
    @DisplayName("getVencimentoPadrao retorna data com dia 4")
    void retornaDiaQuatro() {
        LocalDate venc = VencimentoUtil.getVencimentoPadrao();
        assertEquals(4, venc.getDayOfMonth());
    }

    @Test
    @DisplayName("getVencimentoPadrao retorna data no mês atual ou seguinte")
    void retornaMesAtualOuSeguinte() {
        LocalDate hoje = LocalDate.now();
        LocalDate venc = VencimentoUtil.getVencimentoPadrao();
        assertTrue(
                venc.equals(LocalDate.of(hoje.getYear(), hoje.getMonth(), 4))
                        || venc.equals(LocalDate.of(hoje.getYear(), hoje.getMonth(), 4).plusMonths(1)),
                "Vencimento deve ser dia 4 do mês atual ou do mês seguinte"
        );
    }

    @Test
    @DisplayName("getVencimentoPadrao não retorna data no passado (em relação ao dia de hoje)")
    void naoRetornaDataNoPassado() {
        LocalDate hoje = LocalDate.now();
        LocalDate venc = VencimentoUtil.getVencimentoPadrao();
        assertTrue(!venc.isBefore(hoje) || venc.getDayOfMonth() == 4,
                "Se hoje for dia 1 a 4, vencimento é dia 4 do mês atual; senão, dia 4 do mês seguinte");
    }
}
