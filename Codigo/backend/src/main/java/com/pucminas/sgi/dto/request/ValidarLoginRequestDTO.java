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
public class ValidarLoginRequestDTO {

    @NotBlank(message = "Login/usuário é obrigatório")
    @Size(max = 100)
    private String login;
}
