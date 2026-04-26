package com.pucminas.sgi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO que representa um recibo de pagamento.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReciboDTO {

    private UUID pagamentoId;
    private UUID dividaId;
    private String protocoloDivida;
    private String nomeCliente;
    private BigDecimal valorPago;
    private LocalDate dataPagamento;
    private String metodoPagamento;
    private LocalDateTime dataHoraRegistro;
}
