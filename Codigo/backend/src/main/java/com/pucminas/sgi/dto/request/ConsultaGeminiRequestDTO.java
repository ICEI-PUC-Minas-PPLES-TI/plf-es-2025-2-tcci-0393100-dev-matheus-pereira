package com.pucminas.sgi.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request para consulta à IA (Gemini) sobre reforma tributária.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConsultaGeminiRequestDTO {

    @NotBlank(message = "Pergunta é obrigatória")
    private String pergunta;

    /** Contexto opcional (ex.: valores, regime) para refinar a resposta. */
    private String contexto;
}
