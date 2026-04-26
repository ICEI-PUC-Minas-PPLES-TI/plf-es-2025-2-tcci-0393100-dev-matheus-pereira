package com.pucminas.sgi.dto.response;

import com.pucminas.sgi.enums.Perfil;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO de resposta do login (token JWT e dados do usuário).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponseDTO {

    private String token;
    private Perfil perfil;
    private String nome;
    private String login;
}
