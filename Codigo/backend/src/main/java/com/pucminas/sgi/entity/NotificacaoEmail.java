package com.pucminas.sgi.entity;

import com.pucminas.sgi.enums.StatusEnvio;
import com.pucminas.sgi.enums.TipoNotificacao;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entidade que representa um registro de notificação por email enviada ou pendente.
 */
@Entity
@Table(name = "notificacao_email", indexes = {
    @Index(name = "idx_notif_cliente", columnList = "clienteId"),
    @Index(name = "idx_notif_divida", columnList = "dividaId"),
    @Index(name = "idx_notif_status", columnList = "statusEnvio"),
    @Index(name = "idx_notif_proxima_tentativa", columnList = "statusEnvio, proximaTentativa")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificacaoEmail {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID notificacaoId;

    @Column(nullable = false)
    private UUID clienteId;

    private UUID dividaId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoNotificacao tipo;

    @Column(nullable = false)
    private String emailDestino;

    @Column(nullable = false)
    private String assunto;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String corpoEmail;

    @Column(nullable = false, precision = 19, scale = 0)
    private BigDecimal valorComunicado;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private StatusEnvio statusEnvio = StatusEnvio.PENDENTE;

    @Column(nullable = false)
    @Builder.Default
    private Integer tentativas = 0;

    private LocalDateTime dataEnvio;
    private LocalDateTime proximaTentativa;
    private String mensagemErro;

    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    @PrePersist
    protected void onCreate() {
        criadoEm = LocalDateTime.now();
    }
}
