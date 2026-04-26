package com.pucminas.sgi.dto.request;

import com.pucminas.sgi.enums.Perfil;
import com.pucminas.sgi.enums.StatusUsuario;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO de entrada para cadastro de usuário.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UsuarioDTO {

    @NotBlank(message = "Telefone é obrigatório")
    @Size(max = 20)
    private String telefone;

    @NotBlank(message = "Senha é obrigatória")
    @Size(min = 6)
    private String senha;

    @NotBlank(message = "Nome é obrigatório")
    @Size(max = 255)
    private String nome;

    @NotNull(message = "Perfil é obrigatório")
    private Perfil perfil;

    private StatusUsuario statusUsuario;
}
