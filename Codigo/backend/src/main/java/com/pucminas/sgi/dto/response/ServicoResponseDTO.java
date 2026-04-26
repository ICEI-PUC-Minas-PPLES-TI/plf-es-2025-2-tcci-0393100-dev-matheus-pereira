package com.pucminas.sgi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServicoResponseDTO {

    private UUID servicoId;
    private String nome;
    private String descricao;
    private BigDecimal valorPadrao;
    private Boolean ativo;
}
