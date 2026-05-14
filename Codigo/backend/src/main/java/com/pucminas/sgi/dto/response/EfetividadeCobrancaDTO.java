package com.pucminas.sgi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EfetividadeCobrancaDTO {
    private Integer ano;
    private Integer mes;
    private Integer totalCobrancas;
    private Integer cobrancasEnviadas;
    private Integer cobrancasComFalha;
    private Integer pagamentosRecebidos;
    private BigDecimal valorRecebidoTotal;
    private BigDecimal taxaEfetividade;
}
