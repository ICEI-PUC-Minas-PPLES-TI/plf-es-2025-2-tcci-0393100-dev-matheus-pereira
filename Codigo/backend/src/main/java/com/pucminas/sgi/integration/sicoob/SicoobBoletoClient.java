package com.pucminas.sgi.integration.sicoob;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pucminas.sgi.config.SicoobProperties;
import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.Divida;
import com.pucminas.sgi.exception.BusinessRuleException;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Cobrança Bancária v3 — emissão e consulta de boletos.
 */
@Component
public class SicoobBoletoClient {

    private final SicoobProperties properties;
    private final SicoobHttpClient httpClient;
    private final ObjectMapper objectMapper;

    public SicoobBoletoClient(SicoobProperties properties, SicoobHttpClient httpClient, ObjectMapper objectMapper) {
        this.properties = properties;
        this.httpClient = httpClient;
        this.objectMapper = objectMapper;
    }

    public JsonNode incluirBoleto(Divida divida) {
        Cliente cliente = divida.getCliente();
        if (properties.isMock()) {
            return SicoobMockSupport.mockBoleto(objectMapper, divida, cliente);
        }
        validarConfigBoleto();

        LocalDate venc = divida.getVencimento() != null ? divida.getVencimento() : LocalDate.now().plusDays(30);
        String hoje = LocalDate.now().toString();

        Map<String, Object> pagador = new LinkedHashMap<>();
        pagador.put("numeroCpfCnpj", apenasDigitos(cliente.getCpfCnpj()));
        pagador.put("nome", truncar(cliente.getNome(), 50));
        pagador.put("endereco", truncar(cliente.getEndereco() != null ? cliente.getEndereco() : "Nao informado", 40));
        pagador.put("bairro", "Centro");
        pagador.put("cidade", "Conselheiro Lafaiete");
        pagador.put("cep", "36400000");
        pagador.put("uf", "MG");
        if (cliente.getEmail() != null && !cliente.getEmail().isBlank()) {
            pagador.put("email", cliente.getEmail());
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("numeroCliente", properties.getNumeroCliente());
        body.put("codigoModalidade", properties.getCodigoModalidade());
        body.put("numeroContaCorrente", properties.getNumeroContaCorrente());
        body.put("codigoEspecieDocumento", "DM");
        body.put("dataEmissao", hoje);
        body.put("seuNumero", truncar(divida.getProtocolo(), 15));
        body.put("identificacaoEmissaoBoleto", 1);
        body.put("identificacaoDistribuicaoBoleto", 1);
        body.put("valor", centavosParaReais(divida.getValorDevedor()));
        body.put("dataVencimento", venc.toString());
        body.put("dataLimitePagamento", venc.toString());
        body.put("pagador", pagador);
        body.put("gerarPdf", false);
        body.put("codigoCadastrarPIX", 1);
        body.put("numeroContratoCobranca", properties.getNumeroContratoCobranca());

        return httpClient.post(properties.getCobrancaBaseUrl(), "/boletos", body);
    }

    public JsonNode consultarBoleto(String nossoNumero) {
        if (properties.isMock()) {
            return objectMapper.createObjectNode();
        }
        return httpClient.get(properties.getCobrancaBaseUrl(), "/boletos", Map.of(
                "numeroContrato", String.valueOf(properties.getNumeroContratoCobranca()),
                "modalidade", "1",
                "nossoNumero", nossoNumero
        ));
    }

    private void validarConfigBoleto() {
        if (properties.getNumeroCliente() <= 0) {
            throw new BusinessRuleException("Configure sicoob.numero-cliente para emitir boleto.");
        }
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
