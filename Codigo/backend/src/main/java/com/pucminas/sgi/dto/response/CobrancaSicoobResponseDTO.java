package com.pucminas.sgi.dto.response;

import com.pucminas.sgi.enums.StatusCobrancaSicoob;
import com.pucminas.sgi.enums.TipoCobrancaSicoob;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CobrancaSicoobResponseDTO {

    private UUID cobrancaId;
    private UUID dividaId;
    private String protocoloDivida;
    private TipoCobrancaSicoob tipo;
    private StatusCobrancaSicoob status;
    private BigDecimal valorCentavos;
    private String pixTxid;
    private String pixCopiaECola;
    private String pixQrCode;
    private String boletoNossoNumero;
    private String boletoLinhaDigitavel;
    private String boletoCodigoBarras;
    private String mensagemErro;
    private LocalDateTime criadoEm;
    private LocalDateTime pagoEm;
}
