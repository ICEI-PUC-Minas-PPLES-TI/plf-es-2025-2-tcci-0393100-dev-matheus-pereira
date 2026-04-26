package com.pucminas.sgi;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Aplicação principal do Sistema de Gerenciamento de Inadimplentes (SGI).
 */
@SpringBootApplication
@EnableScheduling
public class SgiApplication {

    public static void main(String[] args) {
        SpringApplication.run(SgiApplication.class, args);
    }
}
