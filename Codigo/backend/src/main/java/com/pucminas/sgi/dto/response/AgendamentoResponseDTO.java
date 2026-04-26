package com.pucminas.sgi.dto.response;

import com.pucminas.sgi.enums.Periodicidade;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO de resposta com dados do agendamento.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgendamentoResponseDTO {

    private UUID agendamentoId;
    private String nome;
    private String descricao;
    private Periodicidade periodicidade;
    private Integer criterioAtraso;
    private Boolean ativo;
    private LocalDateTime ultimaExecucao;
    private LocalDateTime proximaExecucao;
    private LocalDateTime criadoEm;
}
