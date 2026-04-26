package com.pucminas.sgi.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * DTO de entrada para registro de dívida.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DividaDTO {

    @NotNull(message = "ID do cliente é obrigatório")
    private UUID clienteId;

    @NotNull(message = "Valor original é obrigatório")
    @DecimalMin(value = "1", message = "Valor deve ser maior que zero")
    private BigDecimal valorOriginal;

    /** Opcional: se não informado, usa vencimento padrão (dia 4 do mês). */
    private LocalDate vencimento;

    @Size(max = 500)
    private String descricao;

    /**
     * Serviços prestados com valor por item (para exibir no e-mail de cobrança).
     * Valor em centavos. Opcional.
     */
    @Valid
    private List<ItemServicoDTO> itensServicos;
}
