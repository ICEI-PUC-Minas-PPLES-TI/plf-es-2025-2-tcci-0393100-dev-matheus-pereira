package com.pucminas.sgi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * Relatório Aging por faixas de atraso.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgingReportDTO {

    private Integer totalDividas;
    private BigDecimal valorTotal;
    private List<FaixaAgingDTO> faixas;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FaixaAgingDTO {
        private String faixa;
        private Integer quantidade;
        private BigDecimal valor;
    }
}
