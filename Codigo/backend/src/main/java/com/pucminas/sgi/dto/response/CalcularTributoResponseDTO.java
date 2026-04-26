package com.pucminas.sgi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Resposta genérica de cálculo de tributo (CBS/IBS).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CalcularTributoResponseDTO {

    private BigDecimal baseCalculo;
    private BigDecimal valorImposto;
    private BigDecimal valorSemImposto;
    private BigDecimal valorTotal;
    private BigDecimal cbs;
    private BigDecimal ibs;
    private BigDecimal totalImpostos;
    private BigDecimal precoVenda;
    private BigDecimal margemLucro;
    private BigDecimal custoAquisicao;
    private String tipo;
    private String categoria;
}
