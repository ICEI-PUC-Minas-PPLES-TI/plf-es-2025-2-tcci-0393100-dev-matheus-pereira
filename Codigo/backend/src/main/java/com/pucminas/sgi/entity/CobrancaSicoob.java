package com.pucminas.sgi.entity;

import com.pucminas.sgi.enums.StatusCobrancaSicoob;
import com.pucminas.sgi.enums.TipoCobrancaSicoob;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Cobrança emitida via API Sicoob (Pix ou boleto) vinculada a uma dívida.
 */
@Entity
@Table(name = "cobranca_sicoob", indexes = {
        @Index(name = "idx_cobranca_sicoob_divida", columnList = "dividaId"),
        @Index(name = "idx_cobranca_sicoob_txid", columnList = "pixTxid", unique = true),
        @Index(name = "idx_cobranca_sicoob_nosso_numero", columnList = "boletoNossoNumero")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CobrancaSicoob {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID cobrancaId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "divida_id", nullable = false)
    private Divida divida;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoCobrancaSicoob tipo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private StatusCobrancaSicoob status = StatusCobrancaSicoob.PENDENTE;

    /** Valor em centavos no momento da emissão. */
    @Column(nullable = false, precision = 19, scale = 0)
    private BigDecimal valorCentavos;

    /** Identificador Pix (txid) — cobrança imediata. */
    @Column(unique = true)
    private String pixTxid;

    @Column(columnDefinition = "TEXT")
    private String pixCopiaECola;

    @Column(columnDefinition = "TEXT")
    private String pixQrCode;

    private String boletoNossoNumero;

    @Column(columnDefinition = "TEXT")
    private String boletoLinhaDigitavel;

    @Column(columnDefinition = "TEXT")
    private String boletoCodigoBarras;

    @Column(columnDefinition = "TEXT")
    private String mensagemErro;

    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    private LocalDateTime atualizadoEm;

    private LocalDateTime pagoEm;

    @PrePersist
    protected void onCreate() {
        criadoEm = LocalDateTime.now();
        atualizadoEm = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        atualizadoEm = LocalDateTime.now();
    }
}
