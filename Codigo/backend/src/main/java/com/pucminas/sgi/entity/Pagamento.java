package com.pucminas.sgi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entidade que representa um pagamento realizado sobre uma dívida.
 */
@Entity
@Table(name = "pagamento", indexes = {
    @Index(name = "idx_pagamento_divida", columnList = "dividaId"),
    @Index(name = "idx_pagamento_data", columnList = "dataPagamento")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Pagamento {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID pagamentoId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "divida_id", nullable = false)
    private Divida divida;

    @Column(name = "divida_id", insertable = false, updatable = false)
    private UUID dividaId;

    /**
     * Valor pago em centavos.
     */
    @Column(nullable = false, precision = 19, scale = 0)
    private BigDecimal valorPago;

    @Column(nullable = false)
    private LocalDate dataPagamento;

    private String metodoPagamento;

    /**
     * URL ou path do comprovante.
     */
    private String comprovante;

    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    @PrePersist
    protected void onCreate() {
        criadoEm = LocalDateTime.now();
    }
}
