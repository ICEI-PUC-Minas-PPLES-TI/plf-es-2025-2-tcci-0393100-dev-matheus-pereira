package com.pucminas.sgi.dto.request;

import com.pucminas.sgi.enums.Perfil;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Payload de cadastro de usuário (contrato frontend).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CadastroUsuarioDTO {
    @NotBlank(message = "Nome é obrigatório")
    @Size(max = 255)
    private String nome;
    @Size(max = 255)
    private String email;
    private Boolean ativo;
    @Size(max = 20)
    private String telefone1;
    @Size(max = 20)
    private String telefone2;
    @Size(max = 100)
    private String funcao;
    @Size(max = 50)
    private String permissao;
    @Size(max = 100)
    private String planta;
    @Size(max = 255)
    private String senha;
    @Size(max = 100)
    private String login;
}
