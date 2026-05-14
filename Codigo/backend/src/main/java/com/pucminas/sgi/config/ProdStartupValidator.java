package com.pucminas.sgi.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Em produção, exige JWT_SECRET definido e diferente do valor padrão de desenvolvimento.
 */
@Component
@Profile("prod")
public class ProdStartupValidator {

    private static final Logger log = LoggerFactory.getLogger(ProdStartupValidator.class);

    private static final String DEFAULT_DEV_SECRET = "MeuSecretSuperSeguroParaSGI2025Minimo256BitsParaHS256";

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${spring.datasource.url}")
    private String datasourceUrl;

    @EventListener(ApplicationReadyEvent.class)
    public void validate() {
        if (jwtSecret == null || jwtSecret.isBlank() || DEFAULT_DEV_SECRET.equals(jwtSecret)) {
            throw new IllegalStateException(
                    "Em producao, defina JWT_SECRET (variavel de ambiente) com valor forte e unico.");
        }
        if (jwtSecret.length() < 32) {
            throw new IllegalStateException("JWT_SECRET deve ter pelo menos 32 caracteres em producao.");
        }
        log.info("Perfil prod ativo. Banco: {}", datasourceUrl);
    }
}
