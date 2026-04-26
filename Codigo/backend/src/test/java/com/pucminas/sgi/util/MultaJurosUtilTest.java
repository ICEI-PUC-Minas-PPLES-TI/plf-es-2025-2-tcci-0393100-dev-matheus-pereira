package com.pucminas.sgi.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Testes unitários para cálculo de multa e juros.
 * Valores em centavos (ex.: 10000 = R$ 100,00).
 */
@DisplayName("MultaJurosUtil")
class MultaJurosUtilTest {

    private static final BigDecimal DEZ_MIL = new BigDecimal("10000"); // R$ 100,00

    @Nested
    @DisplayName("calcularMulta")
    class CalcularMulta {

        @Test
        @DisplayName("retorna zero quando não há atraso (data ref = vencimento)")
        void semAtraso() {
            LocalDate venc = LocalDate.of(2025, 2, 1);
            LocalDate ref = LocalDate.of(2025, 2, 1);
            BigDecimal multa = MultaJurosUtil.calcularMulta(DEZ_MIL, venc, ref);
            assertEquals(BigDecimal.ZERO, multa);
        }

        @Test
        @DisplayName("retorna zero quando data ref é antes do vencimento")
        void dataRefAntesVencimento() {
            LocalDate venc = LocalDate.of(2025, 2, 10);
            LocalDate ref = LocalDate.of(2025, 2, 5);
            BigDecimal multa = MultaJurosUtil.calcularMulta(DEZ_MIL, venc, ref);
            assertEquals(BigDecimal.ZERO, multa);
        }

        @Test
        @DisplayName("1 dia de atraso: 0,33% sobre principal")
        void umDiaAtraso() {
            LocalDate venc = LocalDate.of(2025, 2, 1);
            LocalDate ref = LocalDate.of(2025, 2, 2);
            BigDecimal multa = MultaJurosUtil.calcularMulta(DEZ_MIL, venc, ref);
            // 10000 * 0.0033 = 33
            assertEquals(new BigDecimal("33"), multa);
        }

        @Test
        @DisplayName("10 dias de atraso: 3,3% sobre principal")
        void dezDiasAtraso() {
            LocalDate venc = LocalDate.of(2025, 2, 1);
            LocalDate ref = LocalDate.of(2025, 2, 11);
            BigDecimal multa = MultaJurosUtil.calcularMulta(DEZ_MIL, venc, ref);
            // 10000 * 0.033 = 330
            assertEquals(new BigDecimal("330"), multa);
        }

        @Test
        @DisplayName("30 dias de atraso: 0,33% * 30 = 9,9%")
        void trintaDiasAtraso() {
            LocalDate venc = LocalDate.of(2025, 2, 1);
            LocalDate ref = LocalDate.of(2025, 3, 3);
            BigDecimal multa = MultaJurosUtil.calcularMulta(DEZ_MIL, venc, ref);
            // 10000 * 0.0033 * 30 = 990
            assertEquals(new BigDecimal("990"), multa);
        }

        @Test
        @DisplayName("mais de 30 dias: multa limitada a 30 dias (9,9%)")
        void maisDeTrintaDiasMultaCapped() {
            LocalDate venc = LocalDate.of(2025, 1, 1);
            LocalDate ref = LocalDate.of(2025, 3, 15); // 73 dias
            BigDecimal multa = MultaJurosUtil.calcularMulta(DEZ_MIL, venc, ref);
            assertEquals(new BigDecimal("990"), multa);
        }

        @Test
        @DisplayName("principal zero retorna multa zero")
        void principalZero() {
            LocalDate venc = LocalDate.of(2025, 2, 1);
            LocalDate ref = LocalDate.of(2025, 2, 10);
            BigDecimal multa = MultaJurosUtil.calcularMulta(BigDecimal.ZERO, venc, ref);
            assertEquals(BigDecimal.ZERO, multa);
        }
    }

    @Nested
    @DisplayName("calcularJuros")
    class CalcularJuros {

        @Test
        @DisplayName("retorna zero quando não há atraso")
        void semAtraso() {
            LocalDate venc = LocalDate.of(2025, 2, 1);
            LocalDate ref = LocalDate.of(2025, 2, 1);
            BigDecimal juros = MultaJurosUtil.calcularJuros(DEZ_MIL, BigDecimal.ZERO, venc, ref);
            assertEquals(BigDecimal.ZERO, juros);
        }

        @Test
        @DisplayName("retorna zero quando atraso é menos de 1 mês completo")
        void menosDeUmMesSemJuros() {
            LocalDate venc = LocalDate.of(2025, 2, 1);
            LocalDate ref = LocalDate.of(2025, 2, 28); // ainda não 1 mês entre 1/2 e 28/2
            BigDecimal multa = MultaJurosUtil.calcularMulta(DEZ_MIL, venc, ref);
            BigDecimal juros = MultaJurosUtil.calcularJuros(DEZ_MIL, multa, venc, ref);
            // ChronoUnit.MONTHS.between(1/2, 28/2) = 0
            assertEquals(BigDecimal.ZERO, juros);
        }

        @Test
        @DisplayName("1 mês de atraso: 2% sobre (principal + multa)")
        void umMesAtraso() {
            LocalDate venc = LocalDate.of(2025, 1, 1);
            LocalDate ref = LocalDate.of(2025, 2, 1); // 1 mês depois
            BigDecimal multa = MultaJurosUtil.calcularMulta(DEZ_MIL, venc, ref); // 31 dias, cap 30 = 990
            BigDecimal juros = MultaJurosUtil.calcularJuros(DEZ_MIL, multa, venc, ref);
            // base = 10000 + 990 = 10990; 2% = 219,80 -> 220 arredondado
            assertEquals(new BigDecimal("220"), juros);
        }

        @Test
        @DisplayName("2 meses de atraso: 4% sobre (principal + multa)")
        void doisMesesAtraso() {
            LocalDate venc = LocalDate.of(2025, 1, 1);
            LocalDate ref = LocalDate.of(2025, 3, 1);
            BigDecimal multa = MultaJurosUtil.calcularMulta(DEZ_MIL, venc, ref);
            BigDecimal juros = MultaJurosUtil.calcularJuros(DEZ_MIL, multa, venc, ref);
            // base 10990 * 0.02 * 2 = 439,60 -> 440
            assertEquals(new BigDecimal("440"), juros);
        }
    }

    @Nested
    @DisplayName("valorTotalComMultaEJuros")
    class ValorTotalComMultaEJuros {

        @Test
        @DisplayName("sem atraso retorna só o principal")
        void semAtraso() {
            LocalDate venc = LocalDate.of(2025, 2, 1);
            LocalDate ref = LocalDate.of(2025, 2, 1);
            BigDecimal total = MultaJurosUtil.valorTotalComMultaEJuros(DEZ_MIL, venc, ref);
            assertEquals(DEZ_MIL, total);
        }

        @Test
        @DisplayName("total = principal + multa + juros com 1 mês atraso")
        void totalComMultaEJuros() {
            LocalDate venc = LocalDate.of(2025, 1, 1);
            LocalDate ref = LocalDate.of(2025, 2, 1);
            BigDecimal total = MultaJurosUtil.valorTotalComMultaEJuros(DEZ_MIL, venc, ref);
            BigDecimal multa = MultaJurosUtil.calcularMulta(DEZ_MIL, venc, ref);
            BigDecimal juros = MultaJurosUtil.calcularJuros(DEZ_MIL, multa, venc, ref);
            assertEquals(DEZ_MIL.add(multa).add(juros), total);
            assertTrue(total.compareTo(DEZ_MIL) > 0);
        }

        @Test
        @DisplayName("valor alto em centavos (ex: R$ 10.000,00)")
        void valorGrande() {
            BigDecimal principal = new BigDecimal("1000000"); // 1.000.000 centavos = R$ 10.000
            LocalDate venc = LocalDate.of(2025, 1, 1);
            LocalDate ref = LocalDate.of(2025, 2, 15); // 1 mês e meio
            BigDecimal total = MultaJurosUtil.valorTotalComMultaEJuros(principal, venc, ref);
            assertTrue(total.compareTo(principal) > 0, "Total deve ser maior que o principal quando há atraso");
        }
    }
}
