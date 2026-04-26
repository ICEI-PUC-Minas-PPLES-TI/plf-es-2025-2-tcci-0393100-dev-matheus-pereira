package com.pucminas.sgi.entity;

import com.pucminas.sgi.enums.Periodicidade;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entidade que representa uma regra de agendamento de lembretes por email.
 */
@Entity
@Table(name = "agendamento_notificacao", indexes = {
    @Index(name = "idx_agendamento_ativo_proxima", columnList = "ativo, proximaExecucao")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgendamentoNotificacao {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID agendamentoId;

    @Column(nullable = false)
    private String nome;

    private String descricao;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Periodicidade periodicidade;

    /**
     * Mínimo de dias em atraso para incluir cliente no lembrete.
     */
    @Column(nullable = false)
    private Integer criterioAtraso;

    @Column(nullable = false)
    @Builder.Default
    private Boolean ativo = true;

    private LocalDateTime ultimaExecucao;
    private LocalDateTime proximaExecucao;

    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    @PrePersist
    protected void onCreate() {
        criadoEm = LocalDateTime.now();
    }
}
