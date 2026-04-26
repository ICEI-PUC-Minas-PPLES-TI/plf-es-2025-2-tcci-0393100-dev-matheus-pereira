package com.pucminas.sgi.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Item de serviço ao registrar dívida: serviço + valor cobrado (centavos).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ItemServicoDTO {

    @NotNull(message = "ID do serviço é obrigatório")
    private UUID servicoId;

    @NotNull(message = "Valor do serviço é obrigatório")
    @DecimalMin(value = "0", message = "Valor não pode ser negativo")
    private BigDecimal valor;
}
