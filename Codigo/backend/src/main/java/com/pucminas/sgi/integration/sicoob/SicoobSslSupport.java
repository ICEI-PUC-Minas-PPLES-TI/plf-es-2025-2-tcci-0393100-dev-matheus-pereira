package com.pucminas.sgi.integration.sicoob;

import com.pucminas.sgi.exception.SicoobApiException;

import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyStore;
import java.security.SecureRandom;

/**
 * Carrega certificado A1 (PKCS12) para mTLS nas APIs Sicoob.
 */
public final class SicoobSslSupport {

    private SicoobSslSupport() {
    }

    public static SSLContext buildSslContext(String certificatePath, String password) {
        if (certificatePath == null || certificatePath.isBlank()) {
            throw new SicoobApiException("Caminho do certificado Sicoob (sicoob.certificate-path) não configurado.");
        }
        Path path = Path.of(certificatePath);
        if (!Files.isRegularFile(path)) {
            throw new SicoobApiException("Certificado Sicoob não encontrado: " + certificatePath);
        }
        char[] pwd = password != null ? password.toCharArray() : new char[0];
        try (InputStream in = Files.newInputStream(path)) {
            KeyStore keyStore = KeyStore.getInstance("PKCS12");
            keyStore.load(in, pwd);
            KeyManagerFactory kmf = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());
            kmf.init(keyStore, pwd);
            SSLContext ctx = SSLContext.getInstance("TLS");
            ctx.init(kmf.getKeyManagers(), null, new SecureRandom());
            return ctx;
        } catch (Exception e) {
            throw new SicoobApiException("Falha ao carregar certificado Sicoob: " + e.getMessage(), e);
        }
    }
}
