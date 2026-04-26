package com.pucminas.sgi.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * DTO de entrada para registro de pagamento.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PagamentoDTO {

    @NotNull(message = "ID da dívida é obrigatório")
    private UUID dividaId;

    @NotNull(message = "Valor pago é obrigatório")
    @DecimalMin(value = "1", message = "Valor deve ser maior que zero")
    private BigDecimal valorPago;

    @NotNull(message = "Data do pagamento é obrigatória")
    private LocalDate dataPagamento;

    @Size(max = 50)
    private String metodoPagamento;

    @Size(max = 500)
    private String comprovante;
}
