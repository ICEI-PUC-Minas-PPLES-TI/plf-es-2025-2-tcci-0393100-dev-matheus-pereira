package com.pucminas.sgi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * DTO de resposta do ranking de maiores devedores.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RankingDevedoresDTO {

    private Integer limite;
    private List<ItemRankingDTO> ranking;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ItemRankingDTO {
        private UUID clienteId;
        private String nomeCliente;
        private String cpfCnpj;
        private BigDecimal saldoDevedor;
        private Integer posicao;
    }
}
