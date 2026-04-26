package com.pucminas.sgi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotaFiscalTributoResponseDTO {

    private BigDecimal subtotal;
    private BigDecimal cbs;
    private BigDecimal ibs;
    private BigDecimal totalImpostos;
    private BigDecimal totalNota;
    private BigDecimal aliquotaEfetivaPercentual;
    private String categoria;
}
