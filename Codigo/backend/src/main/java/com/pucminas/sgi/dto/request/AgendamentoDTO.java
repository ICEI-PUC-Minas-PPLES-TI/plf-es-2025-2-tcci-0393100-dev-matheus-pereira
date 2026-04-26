package com.pucminas.sgi.dto.request;

import com.pucminas.sgi.enums.Periodicidade;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO de entrada para criação/atualização de agendamento de notificações.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgendamentoDTO {

    @NotBlank(message = "Nome é obrigatório")
    @Size(max = 255)
    private String nome;

    @Size(max = 500)
    private String descricao;

    @NotNull(message = "Periodicidade é obrigatória")
    private Periodicidade periodicidade;

    @NotNull(message = "Critério de atraso (dias) é obrigatório")
    @Min(value = 0, message = "Critério de atraso não pode ser negativo")
    private Integer criterioAtraso;

    @NotNull(message = "Indicador ativo é obrigatório")
    private Boolean ativo;
}
