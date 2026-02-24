package com.pw.nexusnav.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;

@Component
public class SqliteTuningInitializer {

    private static final Logger log = LoggerFactory.getLogger(SqliteTuningInitializer.class);

    private final DataSource dataSource;

    public SqliteTuningInitializer(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void tune() {
        try (Connection connection = dataSource.getConnection();
             Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA journal_mode=WAL");
            statement.execute("PRAGMA synchronous=NORMAL");
            statement.execute("PRAGMA foreign_keys=ON");
            statement.execute("PRAGMA busy_timeout=5000");
            log.info("SQLite pragmas applied: journal_mode=WAL, synchronous=NORMAL, foreign_keys=ON, busy_timeout=5000");
        } catch (Exception ex) {
            log.warn("Failed to apply SQLite pragmas", ex);
        }
    }
}
