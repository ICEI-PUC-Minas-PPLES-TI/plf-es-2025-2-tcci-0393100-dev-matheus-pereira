package com.pucminas.sgi.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO de entrada para login (identificador de login e senha).
 * Aceita "login" ou "telefone" (compatível com frontend que ainda envia telefone).
 * O identificador pode ser telefone ou nome de usuário (ex.: josecarlos).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginDTO {

    /** Nome de usuário ou telefone. Use este campo no frontend. */
    private String login;

    /** Aceito para compatibilidade: se login vier vazio, usa este valor. */
    private String telefone;

    @NotBlank(message = "Senha é obrigatória")
    private String senha;

    /** Retorna o identificador para autenticação: login tem prioridade, depois telefone. */
    public String getIdentificador() {
        if (login != null && !login.isBlank()) return login.trim();
        if (telefone != null && !telefone.isBlank()) return telefone.trim();
        return null;
    }
}
