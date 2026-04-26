package com.pucminas.sgi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Vínculo entre dívida e serviço com valor cobrado para esse item.
 * Substitui o ManyToMany simples para permitir valor por serviço.
 */
@Entity
@Table(name = "divida_item_servico", indexes = {
    @Index(name = "idx_divida_item_divida", columnList = "divida_id"),
    @Index(name = "idx_divida_item_servico", columnList = "servico_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DividaServico {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID dividaServicoId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "divida_id", nullable = false)
    private Divida divida;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "servico_id", nullable = false)
    private Servico servico;

    /**
     * Valor cobrado por este serviço nesta dívida (centavos).
     */
    @Column(nullable = false, precision = 19, scale = 0)
    private BigDecimal valor;
}
