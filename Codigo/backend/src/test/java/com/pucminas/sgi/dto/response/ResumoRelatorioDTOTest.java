package com.pucminas.sgi.dto.response;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@DisplayName("ResumoRelatorioDTO")
class ResumoRelatorioDTOTest {

    @Test
    @DisplayName("builder preenche todos os campos")
    void builder() {
        ResumoRelatorioDTO dto = ResumoRelatorioDTO.builder()
                .totalClientes(100)
                .totalDividas(5)
                .totalEmAberto(new BigDecimal("150000"))
                .totalPago(new BigDecimal("50000"))
                .build();
        assertNotNull(dto);
        assertEquals(100, dto.getTotalClientes());
        assertEquals(5, dto.getTotalDividas());
        assertEquals(new BigDecimal("150000"), dto.getTotalEmAberto());
        assertEquals(new BigDecimal("50000"), dto.getTotalPago());
    }

    @Test
    @DisplayName("setters e getters")
    void settersGetters() {
        ResumoRelatorioDTO dto = new ResumoRelatorioDTO();
        dto.setTotalClientes(10);
        dto.setTotalDividas(2);
        dto.setTotalEmAberto(BigDecimal.ZERO);
        dto.setTotalPago(BigDecimal.TEN);
        assertEquals(10, dto.getTotalClientes());
        assertEquals(2, dto.getTotalDividas());
        assertEquals(BigDecimal.ZERO, dto.getTotalEmAberto());
        assertEquals(BigDecimal.TEN, dto.getTotalPago());
    }
}
