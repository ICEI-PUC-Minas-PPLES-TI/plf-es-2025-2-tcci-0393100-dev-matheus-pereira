package com.pucminas.sgi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO de resposta do resumo financeiro (indicadores consolidados).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResumoFinanceiroDTO {

    private LocalDate periodoInicio;
    private LocalDate periodoFim;
    private BigDecimal totalRecebido;
    private BigDecimal totalEmAberto;
    private Integer quantidadeDividasQuitadas;
    private Integer quantidadeDividasEmAberto;
    private Integer quantidadeClientesInadimplentes;
}
