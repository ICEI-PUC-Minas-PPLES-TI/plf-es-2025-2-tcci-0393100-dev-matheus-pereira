package com.pucminas.sgi.dto.response;

import com.pucminas.sgi.enums.Perfil;
import com.pucminas.sgi.enums.StatusUsuario;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO de resposta com dados do usuário (sem senha).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UsuarioResponseDTO {

    private UUID usuarioId;
    /** Identificador de login (pode ser telefone ou nome de usuário). */
    private String login;
    private String nome;
    private Perfil perfil;
    private StatusUsuario statusUsuario;
    private LocalDateTime ultimoAcesso;
    private LocalDateTime criadoEm;
}
