package com.pucminas.sgi.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Request para cálculo com crédito tributário (não-cumulatividade).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreditoTributoRequestDTO {

    @NotNull
    @DecimalMin("0")
    private BigDecimal valorVenda;

    @NotNull
    @DecimalMin("0")
    private BigDecimal valorCompras;

    /** PLENO | REDUZIDO. Default PLENO. */
    private String categoria;
}
