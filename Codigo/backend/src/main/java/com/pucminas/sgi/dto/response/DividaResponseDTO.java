package com.pucminas.sgi.dto.response;

import com.pucminas.sgi.enums.StatusDivida;
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
 * DTO de resposta com dados da dívida.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DividaResponseDTO {

    private UUID dividaId;
    private UUID clienteId;
    private String nomeCliente;
    private BigDecimal valorOriginal;
    private BigDecimal valorDevedor;
    /** Juros + multa em reais (valorDevedor - valorOriginal). Para exibir na coluna "Juros". */
    private BigDecimal juros;
    private LocalDate vencimento;
    private String descricao;
    private StatusDivida statusDivida;
    private String protocolo;
    private LocalDateTime criadoEm;
    private LocalDateTime atualizadoEm;
    /** Serviços prestados com valor por item (para e-mail de cobrança). */
    private List<ItemServicoResponseDTO> itensServicos;
    /** Histórico de pagamentos (parciais e totais) desta dívida. */
    private List<PagamentoResponseDTO> pagamentos;
}
