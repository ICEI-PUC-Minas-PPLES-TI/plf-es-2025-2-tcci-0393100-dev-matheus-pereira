package com.pucminas.sgi.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pucminas.sgi.dto.response.RegimeCnpjResponseDTO;
import com.pucminas.sgi.exception.BusinessRuleException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Service
public class CnpjConsultaService {

    private static final Logger log = LoggerFactory.getLogger(CnpjConsultaService.class);

    private static final String REGIME_MEI = "MEI";
    private static final String REGIME_SIMPLES_NACIONAL = "SIMPLES_NACIONAL";
    private static final String REGIME_NAO_OPTANTE = "NAO_OPTANTE_SIMPLES";

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${cnpj.api.base-url:https://apigateway.conectagov.estaleiro.serpro.gov.br/api-cnpj-empresa/v2/empresa}")
    private String cnpjApiBaseUrl;

    @Value("${cnpj.api.cpf-usuario:}")
    private String cpfUsuario;

    @Value("${cnpj.api.bearer-token:}")
    private String bearerToken;

    @Value("${cnpj.api.brasil.base-url:https://brasilapi.com.br/api/cnpj/v1}")
    private String brasilApiBaseUrl;

    @Value("${cnpj.api.connect-timeout-ms:5000}")
    private int connectTimeoutMs;

    @Value("${cnpj.api.read-timeout-ms:8000}")
    private int readTimeoutMs;

    public RegimeCnpjResponseDTO consultarRegime(String cnpjInformado) {
        String cnpj = limparCnpj(cnpjInformado);
        configurarTimeouts();

        // Quando não há credenciais gov.br, prioriza BrasilAPI para reduzir latência.
        boolean semCredenciaisGov = cpfUsuario == null || cpfUsuario.isBlank();
        semCredenciaisGov = semCredenciaisGov && (bearerToken == null || bearerToken.isBlank());

        if (semCredenciaisGov) {
            try {
                return consultarNaBrasilApi(cnpj);
            } catch (Exception brasilError) {
                log.warn("Falha na BrasilAPI para CNPJ {}: {}", cnpj, brasilError.getMessage());
                try {
                    return consultarNoGovBr(cnpj);
                } catch (Exception govError) {
                    throw new BusinessRuleException("Nao foi possivel consultar o CNPJ agora. Tente novamente.");
                }
            }
        } else {
            try {
                return consultarNoGovBr(cnpj);
            } catch (Exception govError) {
                log.warn("Falha na API gov.br para CNPJ {}: {}", cnpj, govError.getMessage());
                try {
                    return consultarNaBrasilApi(cnpj);
                } catch (Exception brasilError) {
                    throw new BusinessRuleException("Nao foi possivel consultar o CNPJ agora. Tente novamente.");
                }
            }
        }
    }

    private void configurarTimeouts() {
        if (restTemplate.getRequestFactory() instanceof SimpleClientHttpRequestFactory factory) {
            factory.setConnectTimeout(connectTimeoutMs);
            factory.setReadTimeout(readTimeoutMs);
            return;
        }
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeoutMs);
        factory.setReadTimeout(readTimeoutMs);
        restTemplate.setRequestFactory(factory);
    }

    private RegimeCnpjResponseDTO consultarNoGovBr(String cnpj) {
        HttpHeaders headers = new HttpHeaders();
        headers.setAccept(java.util.List.of(MediaType.APPLICATION_JSON));

        if (!cpfUsuario.isBlank()) {
            headers.set("x-cpf-usuario", cpfUsuario);
        }
        if (!bearerToken.isBlank()) {
            headers.setBearerAuth(bearerToken);
        }

        String url = cnpjApiBaseUrl + "?cnpj=" + cnpj;

        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), String.class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null || response.getBody().isBlank()) {
                throw new BusinessRuleException("Resposta vazia da API gov.br");
            }
            JsonNode root = objectMapper.readTree(response.getBody());
            return mapearRespostaGovBr(cnpj, root);
        } catch (RestClientException e) {
            throw new BusinessRuleException("Erro de rede na API gov.br: " + e.getMessage());
        } catch (Exception e) {
            throw new BusinessRuleException("Erro ao processar resposta gov.br: " + e.getMessage());
        }
    }

    private RegimeCnpjResponseDTO consultarNaBrasilApi(String cnpj) {
        String url = brasilApiBaseUrl + "/" + cnpj;
        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, HttpEntity.EMPTY, String.class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null || response.getBody().isBlank()) {
                throw new BusinessRuleException("Resposta vazia da BrasilAPI");
            }
            JsonNode root = objectMapper.readTree(response.getBody());
            return mapearRespostaBrasilApi(cnpj, root);
        } catch (RestClientException e) {
            throw new BusinessRuleException("Erro de rede na BrasilAPI: " + e.getMessage());
        } catch (Exception e) {
            throw new BusinessRuleException("Erro ao processar resposta da BrasilAPI: " + e.getMessage());
        }
    }

    private RegimeCnpjResponseDTO mapearRespostaGovBr(String cnpj, JsonNode root) {
        String nomeEmpresarial = firstNonBlank(
                root.path("nomeEmpresarial").asText(null),
                root.path("nomefantasia").asText(null),
                root.path("nomeFantasia").asText(null)
        );
        if (nomeEmpresarial == null) {
            throw new BusinessRuleException("CNPJ consultado sem nome empresarial retornado pela API gov.br.");
        }

        JsonNode adicionais = root.path("informacoesAdicionais");
        String optanteMei = firstNonBlank(adicionais.path("optanteMei").asText(null), adicionais.path("optanteMEI").asText(null));
        String optanteSimples = adicionais.path("optanteSimples").asText(null);

        return RegimeCnpjResponseDTO.builder()
                .cnpj(cnpj)
                .nomeEmpresa(nomeEmpresarial)
                .regime(classificarRegime(optanteMei, optanteSimples))
                .build();
    }

    private RegimeCnpjResponseDTO mapearRespostaBrasilApi(String cnpj, JsonNode root) {
        String nomeEmpresarial = firstNonBlank(
                root.path("razao_social").asText(null),
                root.path("nome_fantasia").asText(null)
        );
        if (nomeEmpresarial == null) {
            throw new BusinessRuleException("CNPJ consultado sem nome empresarial retornado pela BrasilAPI.");
        }

        String optanteMei = root.path("opcao_pelo_mei").asText(null);
        String optanteSimples = root.path("opcao_pelo_simples").asText(null);

        return RegimeCnpjResponseDTO.builder()
                .cnpj(cnpj)
                .nomeEmpresa(nomeEmpresarial)
                .regime(classificarRegime(optanteMei, optanteSimples))
                .build();
    }

    private static String limparCnpj(String cnpj) {
        if (cnpj == null) {
            throw new BusinessRuleException("CNPJ e obrigatorio.");
        }
        String limpo = cnpj.replaceAll("\\D", "");
        if (limpo.length() != 14) {
            throw new BusinessRuleException("CNPJ invalido. Informe 14 digitos.");
        }
        return limpo;
    }

    private static String classificarRegime(String optanteMei, String optanteSimples) {
        if (isSim(optanteMei)) {
            return REGIME_MEI;
        }
        if (isSim(optanteSimples)) {
            return REGIME_SIMPLES_NACIONAL;
        }
        return REGIME_NAO_OPTANTE;
    }

    private static boolean isSim(String valor) {
        if (valor == null) {
            return false;
        }
        String v = valor.trim().toUpperCase();
        return "S".equals(v) || "SIM".equals(v) || "TRUE".equals(v);
    }

    private static String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }
}
