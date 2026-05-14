package com.pucminas.sgi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ValidarLoginResponseDTO {
    private Boolean encontrado;
    private String login;
    private String nome;
    private String mensagem;
}
