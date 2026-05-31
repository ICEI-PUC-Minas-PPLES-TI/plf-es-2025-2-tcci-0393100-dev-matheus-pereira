package com.pucminas.sgi.integration.sicoob;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.Divida;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Respostas simuladas quando sicoob.mock=true (desenvolvimento/TCC sem certificado).
 */
public final class SicoobMockSupport {

    private SicoobMockSupport() {
    }

    public static ObjectNode mockPixCob(ObjectMapper mapper, Divida divida, String txid) {
        ObjectNode root = mapper.createObjectNode();
        root.put("txid", txid);
        root.put("status", "ATIVA");
        root.put("pixCopiaECola", "00020126580014br.gov.bcb.pix0136" + txid + "5204000053039865405"
                + centavosParaReais(divida.getValorDevedor()) + "5802BR5925SGI MOCK COBRANCA6009SAO PAULO62070503***6304ABCD");
        root.put("location", "https://mock.sicoob/pix/" + txid);
        return root;
    }

    public static ObjectNode mockBoleto(ObjectMapper mapper, Divida divida, Cliente cliente) {
        ObjectNode resultado = mapper.createObjectNode();
        resultado.put("nossoNumero", "MOCK" + divida.getProtocolo().replaceAll("\\D", ""));
        resultado.put("linhaDigitavel", "75691.23456 78901.234567 89012.345678 9 123400000"
                + String.format("%08d", divida.getValorDevedor().longValue()));
        resultado.put("codigoBarras", "75691234567890123456789012345678901234567890");
        resultado.put("qrCode", "00020101021226950014br.gov.bcb.pix2573mock.sicoob/pix/" + divida.getProtocolo());
        ObjectNode root = mapper.createObjectNode();
        root.set("resultado", resultado);
        return root;
    }

    private static String centavosParaReais(BigDecimal centavos) {
        return centavos.divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP).toPlainString();
    }
}
