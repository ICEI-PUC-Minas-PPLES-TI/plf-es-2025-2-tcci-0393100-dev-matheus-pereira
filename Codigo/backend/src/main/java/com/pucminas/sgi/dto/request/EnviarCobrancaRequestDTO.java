package com.pucminas.sgi.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * DTO de entrada para envio de cobrança por email.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnviarCobrancaRequestDTO {

    @NotNull(message = "ID do cliente é obrigatório")
    private UUID clienteId;

    /**
     * Opcional: se informado, envia cobrança apenas desta dívida; senão, envia resumo de todas as dívidas em aberto.
     */
    private UUID dividaId;
}
