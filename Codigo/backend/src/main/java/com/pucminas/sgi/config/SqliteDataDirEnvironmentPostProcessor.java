package com.pucminas.sgi.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Garante que o diretório pai do arquivo SQLite exista antes do DataSource conectar.
 */
public class SqliteDataDirEnvironmentPostProcessor implements EnvironmentPostProcessor {

    private static final Logger log = LoggerFactory.getLogger(SqliteDataDirEnvironmentPostProcessor.class);
    private static final String SQLITE_PREFIX = "jdbc:sqlite:";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String url = environment.getProperty("spring.datasource.url");
        if (url == null || !url.startsWith(SQLITE_PREFIX)) {
            return;
        }
        String filePath = url.substring(SQLITE_PREFIX.length());
        Path parent = Paths.get(filePath).toAbsolutePath().normalize().getParent();
        if (parent == null) {
            return;
        }
        try {
            Files.createDirectories(parent);
            log.info("Diretorio do SQLite pronto: {}", parent);
        } catch (IOException e) {
            throw new IllegalStateException("Nao foi possivel criar diretorio do SQLite: " + parent, e);
        }
    }
}
