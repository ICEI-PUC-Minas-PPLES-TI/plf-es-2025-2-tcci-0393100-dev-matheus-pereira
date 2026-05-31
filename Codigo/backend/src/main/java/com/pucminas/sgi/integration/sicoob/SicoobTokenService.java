package com.pucminas.sgi.integration.sicoob;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pucminas.sgi.config.SicoobProperties;
import com.pucminas.sgi.exception.SicoobApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import javax.net.ssl.SSLContext;
import java.net.http.HttpClient;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicReference;

/**
 * OAuth2 client_credentials com mTLS (token Sicoob).
 */
@Service
public class SicoobTokenService {

    private static final Logger log = LoggerFactory.getLogger(SicoobTokenService.class);

    private final SicoobProperties properties;
    private final ObjectMapper objectMapper;
    private final AtomicReference<CachedToken> cache = new AtomicReference<>();
    private volatile SSLContext sslContext;

    public SicoobTokenService(SicoobProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    public String getAccessToken() {
        if (properties.isMock()) {
            return "mock-access-token";
        }
        CachedToken current = cache.get();
        if (current != null && current.isValid()) {
            return current.token;
        }
        synchronized (this) {
            current = cache.get();
            if (current != null && current.isValid()) {
                return current.token;
            }
            CachedToken fresh = requestToken();
            cache.set(fresh);
            return fresh.token;
        }
    }

    public SSLContext sslContext() {
        if (properties.isMock()) {
            return null;
        }
        if (sslContext == null) {
            synchronized (this) {
                if (sslContext == null) {
                    sslContext = SicoobSslSupport.buildSslContext(
                            properties.getCertificatePath(),
                            properties.getCertificatePassword());
                }
            }
        }
        return sslContext;
    }

    private CachedToken requestToken() {
        try {
            HttpClient.Builder httpBuilder = HttpClient.newBuilder();
            httpBuilder.sslContext(sslContext());
            JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpBuilder.build());

            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("grant_type", "client_credentials");
            form.add("client_id", properties.getClientId());
            form.add("scope", properties.getScopes());

            RestClient client = RestClient.builder()
                    .requestFactory(factory)
                    .build();

            String body = client.post()
                    .uri(properties.getTokenUrl())
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(String.class);

            JsonNode json = objectMapper.readTree(body);
            String token = json.path("access_token").asText(null);
            if (token == null || token.isBlank()) {
                throw new SicoobApiException("Resposta de token Sicoob sem access_token.");
            }
            int expiresIn = json.path("expires_in").asInt(300);
            log.debug("Token Sicoob obtido, expira em {}s", expiresIn);
            return new CachedToken(token, Instant.now().plusSeconds(Math.max(60, expiresIn - 60)));
        } catch (SicoobApiException e) {
            throw e;
        } catch (Exception e) {
            throw new SicoobApiException("Erro ao obter token Sicoob: " + e.getMessage(), e);
        }
    }

    public void invalidate() {
        cache.set(null);
    }

    private record CachedToken(String token, Instant expiresAt) {
        boolean isValid() {
            return Instant.now().isBefore(expiresAt);
        }
    }
}
