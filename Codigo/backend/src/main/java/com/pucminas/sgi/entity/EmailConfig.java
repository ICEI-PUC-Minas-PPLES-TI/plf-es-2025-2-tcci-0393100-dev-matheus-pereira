package com.pucminas.sgi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entidade que armazena a configuração SMTP para envio de emails.
 */
@Entity
@Table(name = "email_config", indexes = {
    @Index(name = "idx_email_config_ativo", columnList = "ativo")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID configId;

    @Column(nullable = false)
    private String host;

    @Column(nullable = false)
    private Integer porta;

    private String usuario;
    private String senha;

    @Column(nullable = false)
    @Builder.Default
    private Boolean usarTLS = true;

    @Column(nullable = false)
    private String emailRemetente;

    private String nomeRemetente;

    @Column(nullable = false)
    @Builder.Default
    private Boolean ativo = false;

    private LocalDateTime atualizadoEm;

    @PreUpdate
    protected void onUpdate() {
        atualizadoEm = LocalDateTime.now();
    }
}
