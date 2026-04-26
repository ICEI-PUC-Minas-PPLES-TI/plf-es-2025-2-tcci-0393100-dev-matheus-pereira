package com.pucminas.sgi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * DTO de resposta do relatório de inadimplentes.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RelatorioInadimplentesDTO {

    private LocalDate periodoInicio;
    private LocalDate periodoFim;
    private Integer totalClientesInadimplentes;
    private BigDecimal valorTotalInadimplente;
    private List<ItemInadimplenteDTO> itens;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ItemInadimplenteDTO {
        private String nomeCliente;
        private String cpfCnpj;
        private Integer quantidadeDividas;
        private BigDecimal saldoDevedor;
        private LocalDate dataVencimentoMaisAntiga;
    }
}
