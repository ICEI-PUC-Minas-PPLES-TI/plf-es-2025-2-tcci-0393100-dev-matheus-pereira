package com.pucminas.sgi.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Request para cálculo de tributos (por dentro, por fora, separar CBS/IBS).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CalcularTributoRequestDTO {

    /** POR_DENTRO | POR_FORA | SEPARAR_CBS_IBS | MARGEM_LUCRO */
    @NotNull(message = "Tipo de cálculo é obrigatório")
    private String tipo;

    /** Valor total (com imposto) para POR_DENTRO/SEPARAR_CBS_IBS; valor base para POR_FORA. */
    @NotNull
    @DecimalMin(value = "0", message = "Valor deve ser >= 0")
    private BigDecimal valor;

    /** PLENO | REDUZIDO | ZERO. Default PLENO. */
    private String categoria;

    /** Para MARGEM_LUCRO: custo de aquisição. */
    private BigDecimal custoAquisicao;
    /** Para MARGEM_LUCRO: margem desejada (ex.: 0.30 = 30%). */
    private BigDecimal margemDesejada;
}
