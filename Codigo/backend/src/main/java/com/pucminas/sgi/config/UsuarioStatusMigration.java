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
 * Corrige o CHECK constraint da tabela usuario no SQLite para incluir PENDENTE_APROVACAO.
 */
@Component
@Order(1)
public class UsuarioStatusMigration {

    private static final Logger log = LoggerFactory.getLogger(UsuarioStatusMigration.class);

    private static final String OLD_CHECK = "('ATIVO','INATIVO')";
    private static final String NEW_CHECK = "('ATIVO','INATIVO','PENDENTE_APROVACAO')";

    private final DataSource dataSource;

    public UsuarioStatusMigration(DataSource dataSource) {
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
            log.trace("Nao e SQLite, migracao de status_usuario ignorada.");
            return;
        }

        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT sql FROM sqlite_master WHERE type='table' AND name='usuario'"
        );
        if (rows.isEmpty() || rows.get(0).get("sql") == null) {
            return;
        }
        String tableSql = (String) rows.get(0).get("sql");
        if (tableSql.contains("'PENDENTE_APROVACAO'")) {
            log.debug("Tabela usuario ja possui PENDENTE_APROVACAO no CHECK.");
            return;
        }
        if (!tableSql.contains(OLD_CHECK)) {
            log.warn("CHECK da tabela usuario em formato inesperado; migracao nao aplicada.");
            return;
        }

        log.info("Aplicando migracao: adicionando PENDENTE_APROVACAO ao CHECK de status_usuario.");
        String createNew = tableSql
                .replace("CREATE TABLE usuario ", "CREATE TABLE usuario_new ")
                .replace("CREATE TABLE \"usuario\" ", "CREATE TABLE usuario_new ")
                .replace(OLD_CHECK, NEW_CHECK);

        jdbc.execute(createNew);
        jdbc.execute("INSERT INTO usuario_new SELECT * FROM usuario");

        List<String> indexSqls = jdbc.queryForList(
                "SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='usuario' AND sql IS NOT NULL",
                String.class
        );

        jdbc.execute("DROP TABLE usuario");
        jdbc.execute("ALTER TABLE usuario_new RENAME TO usuario");

        for (String idxSql : indexSqls) {
            if (idxSql != null && !idxSql.isEmpty()) {
                try {
                    jdbc.execute(idxSql);
                } catch (Exception e) {
                    log.warn("Indice de usuario nao recriado: {}", e.getMessage());
                }
            }
        }

        log.info("Migracao da tabela usuario concluida: PENDENTE_APROVACAO permitido.");
    }
}

