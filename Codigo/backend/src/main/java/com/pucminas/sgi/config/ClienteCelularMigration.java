package com.pucminas.sgi.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.util.List;
import java.util.Map;

/**
 * Adiciona a coluna {@code celular} na tabela cliente (SQLite existente).
 */
@Component
@Order(0)
public class ClienteCelularMigration {

    private static final Logger log = LoggerFactory.getLogger(ClienteCelularMigration.class);

    private final DataSource dataSource;

    public ClienteCelularMigration(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void runMigration() {
        try {
            String url = dataSource.getConnection().getMetaData().getURL();
            if (!url.contains("sqlite")) {
                return;
            }
        } catch (Exception e) {
            log.trace("Nao e SQLite, migracao de celular ignorada.");
            return;
        }

        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        List<Map<String, Object>> cols = jdbc.queryForList("PRAGMA table_info(cliente)");
        if (cols.isEmpty()) {
            return;
        }
        boolean hasCelular = cols.stream()
                .anyMatch(c -> "celular".equalsIgnoreCase(String.valueOf(c.get("name"))));
        if (hasCelular) {
            log.debug("Coluna cliente.celular ja existe.");
            return;
        }

        log.info("Aplicando migracao: adicionando coluna celular em cliente.");
        jdbc.execute("ALTER TABLE cliente ADD COLUMN celular VARCHAR(20)");
        log.info("Migracao cliente.celular concluida.");
    }
}
