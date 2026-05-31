package com.pucminas.sgi.integration.sicoob;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pucminas.sgi.config.SicoobProperties;
import com.pucminas.sgi.exception.SicoobApiException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.util.Map;

/**
 * Cliente HTTP comum (mTLS + Bearer + client_id) para APIs Sicoob.
 */
@Component
public class SicoobHttpClient {

    private final SicoobProperties properties;
    private final SicoobTokenService tokenService;
    private final ObjectMapper objectMapper;

    public SicoobHttpClient(SicoobProperties properties,
                            SicoobTokenService tokenService,
                            ObjectMapper objectMapper) {
        this.properties = properties;
        this.tokenService = tokenService;
        this.objectMapper = objectMapper;
    }

    public JsonNode get(String baseUrl, String path, Map<String, String> query) {
        return exchange(baseUrl, path, "GET", null, query);
    }

    public JsonNode post(String baseUrl, String path, Object body) {
        return exchange(baseUrl, path, "POST", body, Map.of());
    }

    public JsonNode put(String baseUrl, String path, Object body) {
        return exchange(baseUrl, path, "PUT", body, Map.of());
    }

    private JsonNode exchange(String baseUrl, String path, String method, Object body, Map<String, String> query) {
        if (properties.isMock()) {
            throw new SicoobApiException("Chamada HTTP Sicoob em modo mock — use SicoobMockSupport.");
        }
        try {
            HttpClient.Builder builder = HttpClient.newBuilder();
            if (tokenService.sslContext() != null) {
                builder.sslContext(tokenService.sslContext());
            }
            JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(builder.build());

            RestClient.Builder clientBuilder = RestClient.builder()
                    .requestFactory(factory)
                    .baseUrl(baseUrl)
                    .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                    .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .defaultHeader("client_id", properties.getClientId())
                    .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + tokenService.getAccessToken());

            RestClient client = clientBuilder.build();

            RestClient.RequestBodySpec spec = client.method(org.springframework.http.HttpMethod.valueOf(method))
                    .uri(uriBuilder -> {
                        var b = uriBuilder.path(path);
                        query.forEach(b::queryParam);
                        return b.build();
                    });

            String response;
            if (body != null) {
                response = spec.body(body).retrieve().body(String.class);
            } else {
                response = spec.retrieve().body(String.class);
            }
            if (response == null || response.isBlank()) {
                return objectMapper.createObjectNode();
            }
            return objectMapper.readTree(response);
        } catch (SicoobApiException e) {
            throw e;
        } catch (org.springframework.web.client.RestClientResponseException e) {
            throw new SicoobApiException(
                    "Sicoob HTTP " + e.getStatusCode().value() + ": " + e.getResponseBodyAsString(),
                    e.getStatusCode().value());
        } catch (Exception e) {
            throw new SicoobApiException("Erro HTTP Sicoob: " + e.getMessage(), e);
        }
    }
}
