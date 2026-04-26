package com.pucminas.sgi.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Itens para cálculo de nota fiscal (CBS/IBS).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotaFiscalTributoRequestDTO {

    @NotEmpty(message = "Informe ao menos um item")
    @Valid
    private List<ItemNotaFiscalDTO> itens;

    /** PLENO | REDUZIDO | ZERO. Aplica a todos os itens. */
    private String categoria;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ItemNotaFiscalDTO {
        private String nome;
        /** Valor total do item (já com imposto embutido). */
        @jakarta.validation.constraints.NotNull
        @jakarta.validation.constraints.DecimalMin("0")
        private java.math.BigDecimal valorTotal;
    }
}
