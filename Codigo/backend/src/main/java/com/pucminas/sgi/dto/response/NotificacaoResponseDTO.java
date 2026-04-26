package com.pucminas.sgi.dto.response;

import com.pucminas.sgi.enums.StatusEnvio;
import com.pucminas.sgi.enums.TipoNotificacao;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO de resposta com dados da notificação por email.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificacaoResponseDTO {

    private UUID notificacaoId;
    private UUID clienteId;
    private UUID dividaId;
    private TipoNotificacao tipo;
    private String emailDestino;
    private String assunto;
    private BigDecimal valorComunicado;
    private StatusEnvio statusEnvio;
    private Integer tentativas;
    private LocalDateTime dataEnvio;
    private String mensagemErro;
    private LocalDateTime criadoEm;
}
