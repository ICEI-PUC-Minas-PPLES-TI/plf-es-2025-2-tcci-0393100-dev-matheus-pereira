package com.pucminas.sgi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Resumo para o dashboard (contrato frontend).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResumoRelatorioDTO {
    private int totalClientes;
    private int totalDividas;
    private java.math.BigDecimal totalEmAberto;
    private java.math.BigDecimal totalPago;
}
