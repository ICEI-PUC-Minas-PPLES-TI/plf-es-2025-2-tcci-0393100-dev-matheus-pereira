package com.pucminas.sgi.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "juros_config")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JurosConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, precision = 10, scale = 4)
    private BigDecimal multaDiaria;

    @Column(nullable = false, precision = 10, scale = 4)
    private BigDecimal capMultaPercentual;

    @Column(nullable = false, precision = 10, scale = 4)
    private BigDecimal jurosMensal;

    private LocalDateTime atualizadoEm;
}

