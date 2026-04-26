package com.pucminas.sgi.entity;

import com.pucminas.sgi.enums.StatusDivida;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Entidade que representa uma dívida de um cliente.
 */
@Entity
@Table(name = "divida", indexes = {
    @Index(name = "idx_divida_cliente", columnList = "clienteId"),
    @Index(name = "idx_divida_vencimento", columnList = "vencimento"),
    @Index(name = "idx_divida_status", columnList = "statusDivida"),
    @Index(name = "idx_divida_protocolo", columnList = "protocolo", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Divida {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID dividaId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;

    /**
     * Valor original da dívida em centavos.
     */
    @Column(nullable = false, precision = 19, scale = 0)
    private BigDecimal valorOriginal;

    /**
     * Valor ainda devedor em centavos (calculado após pagamentos).
     */
    @Column(nullable = false, precision = 19, scale = 0)
    private BigDecimal valorDevedor;

    @Column(nullable = false)
    private LocalDate vencimento;

    private String descricao;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private StatusDivida statusDivida = StatusDivida.EM_ABERTO;

    @Column(nullable = false, unique = true)
    private String protocolo;

    @Column(nullable = false, updatable = false)
    private LocalDateTime criadoEm;

    private LocalDateTime atualizadoEm;

    @OneToMany(mappedBy = "divida", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Pagamento> pagamentos = new ArrayList<>();

    @OneToMany(mappedBy = "divida", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<DividaServico> itensServicos = new ArrayList<>();

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
