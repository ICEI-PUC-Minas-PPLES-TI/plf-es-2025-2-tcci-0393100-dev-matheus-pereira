package com.pucminas.sgi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO de resposta da configuração de email (sem expor senha).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailConfigResponseDTO {

    private UUID configId;
    private String host;
    private Integer porta;
    private String usuario;
    private String emailRemetente;
    private String nomeRemetente;
    private Boolean usarTLS;
    private Boolean ativo;
    private LocalDateTime atualizadoEm;
}
