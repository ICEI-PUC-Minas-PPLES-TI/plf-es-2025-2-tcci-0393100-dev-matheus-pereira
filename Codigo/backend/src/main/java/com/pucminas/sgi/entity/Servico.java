package com.pucminas.sgi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Entidade que representa um serviço prestado pelo escritório (catálogo).
 */
@Entity
@Table(name = "servico", indexes = {
    @Index(name = "idx_servico_ativo", columnList = "ativo")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Servico {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID servicoId;

    @Column(nullable = false, length = 200)
    private String nome;

    @Column(length = 500)
    private String descricao;

    /**
     * Valor padrão em centavos (opcional).
     */
    @Column(precision = 19, scale = 0)
    private BigDecimal valorPadrao;

    @Column(nullable = false)
    @Builder.Default
    private Boolean ativo = true;
}
