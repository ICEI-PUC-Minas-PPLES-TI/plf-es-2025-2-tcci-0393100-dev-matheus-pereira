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
 * Corrige o CHECK constraint da tabela divida no SQLite para incluir o status CANCELADA.
 * O Hibernate criou o CHECK apenas com os valores antigos; como o SQLite não permite
 * ALTER TABLE para mudar CHECK, recriamos a tabela com o constraint atualizado.
 */
@Component
@Order(0)
public class DividaStatusMigration {

    private static final Logger log = LoggerFactory.getLogger(DividaStatusMigration.class);

    private static final String OLD_CHECK = "('EM_ABERTO','PARCIAL','QUITADA','VENCIDA')";
    private static final String NEW_CHECK = "('EM_ABERTO','PARCIAL','QUITADA','VENCIDA','CANCELADA')";

    private final DataSource dataSource;

    public DividaStatusMigration(DataSource dataSource) {
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
            log.trace("Não é SQLite, migração de status_divida ignorada.");
            return;
        }

        JdbcTemplate jdbc = new JdbcTemplate(dataSource);

        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT sql FROM sqlite_master WHERE type='table' AND name='divida'"
        );
        if (rows.isEmpty() || rows.get(0).get("sql") == null) {
            return;
        }
        String tableSql = (String) rows.get(0).get("sql");
        if (tableSql.contains("'CANCELADA'")) {
            log.debug("Tabela divida já possui status CANCELADA no CHECK.");
            return;
        }
        if (!tableSql.contains(OLD_CHECK)) {
            log.warn("CHECK da tabela divida em formato inesperado; migração não aplicada.");
            return;
        }

        log.info("Aplicando migração: adicionando CANCELADA ao CHECK de status_divida na tabela divida.");

        String createNew = tableSql
                .replace("CREATE TABLE divida ", "CREATE TABLE divida_new ")
                .replace("CREATE TABLE \"divida\" ", "CREATE TABLE divida_new ")
                .replace(OLD_CHECK, NEW_CHECK);

        jdbc.execute(createNew);
        jdbc.execute("INSERT INTO divida_new SELECT * FROM divida");

        List<String> indexSqls = jdbc.queryForList(
                "SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='divida' AND sql IS NOT NULL",
                String.class
        );

        jdbc.execute("DROP TABLE divida");
        jdbc.execute("ALTER TABLE divida_new RENAME TO divida");

        for (String idxSql : indexSqls) {
            if (idxSql != null && !idxSql.isEmpty()) {
                try {
                    jdbc.execute(idxSql);
                } catch (Exception e) {
                    log.warn("Índice não recriado: {} - {}", idxSql.substring(0, Math.min(50, idxSql.length())), e.getMessage());
                }
            }
        }

        log.info("Migração da tabela divida concluída: status CANCELADA permitido.");
    }
}
