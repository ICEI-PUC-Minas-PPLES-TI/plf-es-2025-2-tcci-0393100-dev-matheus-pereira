package com.pucminas.sgi.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Payload de criação de inadimplência (registro de dívida) - contrato frontend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InadimplenciaPayloadDTO {

    @NotNull(message = "clienteId é obrigatório")
    private UUID clienteId;
    @NotNull(message = "valor é obrigatório")
    @DecimalMin(value = "0", message = "valor deve ser >= 0")
    /** Valor em REAIS (ex.: 1000 = R$ 1.000,00). O backend converte para centavos ao salvar. */
    private BigDecimal valor;
    /** Opcional: se não informado, usa vencimento padrão (dia 4 do mês). */
    private LocalDate vencimento;
    @Size(max = 500)
    private String descricao;
}
