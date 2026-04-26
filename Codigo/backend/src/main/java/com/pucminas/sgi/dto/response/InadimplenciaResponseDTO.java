package com.pucminas.sgi.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * DTO de resposta para o frontend: inadimplência (dívida) no contrato da API.
 * status: "EmAberto" | "Pago" | "Acordo"
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InadimplenciaResponseDTO {

    @JsonProperty("id")
    private UUID dividaId;
    private UUID clienteId;
    private String clienteNome;
    /** Valor original em REAIS (ex.: 1000.00 = R$ 1.000,00). */
    private BigDecimal valorOriginal;
    /** Juros + multa em REAIS (acréscimos por atraso). Ex.: 121.00 = R$ 121,00. */
    private BigDecimal juros;
    /** Valor total em REAIS (valorOriginal + juros). Exibir como "Valor total". */
    private BigDecimal valor;
    private LocalDate vencimento;
    private String descricao;
    /** EmAberto | Pago | Acordo */
    private String status;
    @JsonProperty("createdAt")
    private LocalDateTime criadoEm;
    @JsonProperty("updatedAt")
    private LocalDateTime atualizadoEm;
    /** Pagamentos registrados nesta dívida (parciais e totais). */
    private List<PagamentoResponseDTO> pagamentos;
}
