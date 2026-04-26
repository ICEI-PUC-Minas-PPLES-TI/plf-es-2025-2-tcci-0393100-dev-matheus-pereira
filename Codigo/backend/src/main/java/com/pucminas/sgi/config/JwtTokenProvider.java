package com.pucminas.sgi.config;

import com.pucminas.sgi.enums.Perfil;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

/**
 * Geração e validação de tokens JWT.
 */
@Component
public class JwtTokenProvider {

    private static final Logger log = LoggerFactory.getLogger(JwtTokenProvider.class);

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration:86400000}")
    private long jwtExpirationMs;

    private SecretKey getSigningKey() {
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            keyBytes = java.util.Arrays.copyOf(keyBytes, 32);
        }
        return Keys.hmacShaKeyFor(keyBytes);
    }

    /**
     * Gera um token JWT para o usuário.
     */
    public String generateToken(UUID usuarioId, String telefone, Perfil perfil, String nome) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + jwtExpirationMs);
        return Jwts.builder()
                .subject(usuarioId.toString())
                .claim("telefone", telefone)
                .claim("perfil", perfil.name())
                .claim("nome", nome)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(getSigningKey())
                .compact();
    }

    /**
     * Valida o token e retorna o ID do usuário.
     */
    public JwtClaims getClaims(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return new JwtClaims(
                    UUID.fromString(claims.getSubject()),
                    claims.get("telefone", String.class),
                    Perfil.valueOf(claims.get("perfil", String.class)),
                    claims.get("nome", String.class)
            );
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("Token inválido: {}", e.getMessage());
            return null;
        }
    }

    public boolean validateToken(String token) {
        return getClaims(token) != null;
    }

    public record JwtClaims(UUID usuarioId, String telefone, Perfil perfil, String nome) {}
}
