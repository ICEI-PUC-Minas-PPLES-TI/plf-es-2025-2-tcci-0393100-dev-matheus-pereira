package com.pucminas.sgi.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RedefinirSenhaRequestDTO {

    @NotBlank(message = "Login/usuário é obrigatório")
    @Size(max = 100)
    private String login;

    @NotBlank(message = "Nova senha é obrigatória")
    @Size(min = 4, max = 255, message = "Nova senha deve ter entre 4 e 255 caracteres")
    private String novaSenha;

    @NotBlank(message = "Confirmação de senha é obrigatória")
    @Size(min = 4, max = 255, message = "Confirmação de senha deve ter entre 4 e 255 caracteres")
    private String confirmarSenha;
}
