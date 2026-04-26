package com.pucminas.sgi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Item de serviço na resposta da dívida: nome do serviço + valor cobrado (centavos).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ItemServicoResponseDTO {

    private UUID servicoId;
    private String nomeServico;
    private BigDecimal valor;
}
