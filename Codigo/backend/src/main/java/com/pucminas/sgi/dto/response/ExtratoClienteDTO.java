package com.pucminas.sgi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExtratoClienteDTO {
    private ExtratoClienteInfo cliente;
    private List<ExtratoDividaItem> dividasAtivas;
    private List<ExtratoPagamentoItem> historicoPagamentos;
    private List<ExtratoNotificacaoItem> notificacoes;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExtratoClienteInfo {
        private String nome;
        private String cpfCnpj;
        private String telefone;
        private String celular;
        private String email;
        private String status;
        private BigDecimal saldoDevedorTotal;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExtratoDividaItem {
        private java.util.UUID id;
        private String protocolo;
        private String descricao;
        private String vencimento;
        private BigDecimal valorOriginal;
        private BigDecimal valorDevido;
        private String status;
        private int diasAtraso;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExtratoPagamentoItem {
        private String data;
        private String protocolo;
        private BigDecimal valorPago;
        private String metodo;
        private BigDecimal saldoApos;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExtratoNotificacaoItem {
        private String data;
        private String tipo;
        private String status;
        private int tentativas;
    }
}
