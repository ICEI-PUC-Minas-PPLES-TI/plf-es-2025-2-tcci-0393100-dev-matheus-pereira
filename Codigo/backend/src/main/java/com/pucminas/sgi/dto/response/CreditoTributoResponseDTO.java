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
public class CreditoTributoResponseDTO {

    private BigDecimal impostoSaida;
    private BigDecimal creditoEntrada;
    private BigDecimal impostoDevido;
    private BigDecimal creditoAcumulado;
    private String categoria;
}
