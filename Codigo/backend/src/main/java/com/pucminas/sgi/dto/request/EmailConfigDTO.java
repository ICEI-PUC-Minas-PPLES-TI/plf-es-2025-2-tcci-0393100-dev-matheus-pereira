package com.pucminas.sgi.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO de entrada para configuração SMTP.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailConfigDTO {

    @NotBlank(message = "Host é obrigatório")
    @Size(max = 255)
    private String host;

    @NotNull(message = "Porta é obrigatória")
    @Min(1)
    @Max(65535)
    private Integer porta;

    @Size(max = 255)
    private String usuario;

    @Size(max = 255)
    private String senha;

    @NotNull(message = "Usar TLS é obrigatório")
    private Boolean usarTLS;

    @NotBlank(message = "Email do remetente é obrigatório")
    @Email
    @Size(max = 255)
    private String emailRemetente;

    @Size(max = 255)
    private String nomeRemetente;

    @NotNull(message = "Indicador ativo é obrigatório")
    private Boolean ativo;
}
