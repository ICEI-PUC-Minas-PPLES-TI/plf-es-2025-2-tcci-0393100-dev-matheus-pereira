package com.pucminas.sgi.integration.sicoob;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.pucminas.sgi.config.SicoobProperties;
import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.Divida;
import com.pucminas.sgi.exception.BusinessRuleException;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Pix recebimentos — cobrança imediata (padrão Bacen / API Pix Sicoob).
 */
@Component
public class SicoobPixClient {

    private final SicoobProperties properties;
    private final SicoobHttpClient httpClient;
    private final ObjectMapper objectMapper;

    public SicoobPixClient(SicoobProperties properties, SicoobHttpClient httpClient, ObjectMapper objectMapper) {
        this.properties = properties;
        this.httpClient = httpClient;
        this.objectMapper = objectMapper;
    }

    public JsonNode criarCobrancaImediata(Divida divida, String txid) {
        Cliente cliente = divida.getCliente();
        if (properties.isMock()) {
            return SicoobMockSupport.mockPixCob(objectMapper, divida, txid);
        }
        if (properties.getPixChave() == null || properties.getPixChave().isBlank()) {
            throw new BusinessRuleException("Configure sicoob.pix-chave para emitir cobrança Pix.");
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("calendario", Map.of("expiracao", properties.getPixExpiracaoSegundos()));
        body.put("valor", Map.of("original", centavosParaReais(divida.getValorDevedor())));
        body.put("chave", properties.getPixChave());
        body.put("solicitacaoPagador", "Dívida " + divida.getProtocolo());

        Map<String, Object> devedor = new LinkedHashMap<>();
        devedor.put("nome", truncar(cliente.getNome(), 200));
        String doc = apenasDigitos(cliente.getCpfCnpj());
        if (doc.length() == 11) {
            devedor.put("cpf", doc);
        } else if (doc.length() == 14) {
            devedor.put("cnpj", doc);
        }
        if (!devedor.containsKey("cpf") && !devedor.containsKey("cnpj")) {
            throw new BusinessRuleException("CPF/CNPJ do cliente inválido para cobrança Pix.");
        }
        body.put("devedor", devedor);

        return httpClient.put(properties.getPixBaseUrl(), "/cob/" + txid, body);
    }

    public JsonNode consultarCobranca(String txid) {
        if (properties.isMock()) {
            ObjectNode node = objectMapper.createObjectNode();
            node.put("txid", txid);
            node.put("status", "ATIVA");
            return node;
        }
        return httpClient.get(properties.getPixBaseUrl(), "/cob/" + txid, Map.of());
    }

    public void registrarWebhook(String webhookUrl) {
        if (properties.isMock()) {
            return;
        }
        if (properties.getPixChave() == null || properties.getPixChave().isBlank()) {
            return;
        }
        httpClient.put(properties.getPixBaseUrl(), "/webhook/" + encodeChave(properties.getPixChave()),
                Map.of("webhookUrl", webhookUrl));
    }

    private static String encodeChave(String chave) {
        return java.net.URLEncoder.encode(chave, java.nio.charset.StandardCharsets.UTF_8);
    }

    private static String centavosParaReais(BigDecimal centavos) {
        return centavos.divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP).toPlainString();
    }

    private static String apenasDigitos(String s) {
        return s == null ? "" : s.replaceAll("\\D", "");
    }

    private static String truncar(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max);
    }
}
