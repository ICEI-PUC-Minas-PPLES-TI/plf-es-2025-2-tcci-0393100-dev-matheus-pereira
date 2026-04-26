package com.pucminas.sgi.config;

import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.enums.StatusCliente;
import com.pucminas.sgi.repository.ClienteRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

/**
 * Importa clientes do arquivo data/clientes-importar.txt (formato: "NOME: CPF/CNPJ | TELEFONE").
 * Pula linhas vazias e já existentes por CPF/CNPJ. Executa após o DataSeeder.
 */
@Component
@Order(2)
public class ClientesImportRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(ClientesImportRunner.class);
    private static final String ARQUIVO = "data/clientes-importar.txt";

    private final ClienteRepository clienteRepository;

    public ClientesImportRunner(ClienteRepository clienteRepository) {
        this.clienteRepository = clienteRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        importarSeExistirArquivo();
    }

    @Transactional
    public void importarSeExistirArquivo() {
        try {
            var resource = new ClassPathResource(ARQUIVO);
            if (!resource.exists()) {
                return;
            }
            int inseridos = 0;
            int ignorados = 0;
            int erros = 0;
            try (var reader = new BufferedReader(new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    line = line.trim();
                    if (line.isEmpty()) continue;
                    if (line.startsWith("Página ")) continue;
                    int idxColon = line.indexOf(':');
                    if (idxColon <= 0) {
                        erros++;
                        continue;
                    }
                    String nome = line.substring(0, idxColon).trim();
                    String rest = line.substring(idxColon + 1).trim();
                    int idxPipe = rest.indexOf('|');
                    String cpfCnpj = apenasDigitos(idxPipe >= 0 ? rest.substring(0, idxPipe).trim() : rest);
                    String telefone = idxPipe >= 0 ? apenasDigitos(rest.substring(idxPipe + 1).trim()) : "";
                    if (cpfCnpj.isEmpty() || nome.isEmpty()) {
                        erros++;
                        continue;
                    }
                    if (clienteRepository.findByCpfCnpj(cpfCnpj).isPresent()) {
                        ignorados++;
                        continue;
                    }
                    Cliente c = Cliente.builder()
                            .nome(nome)
                            .cpfCnpj(cpfCnpj)
                            .telefone(telefone.isEmpty() ? null : telefone)
                            .statusCliente(StatusCliente.ATIVO)
                            .saldoDevedor(BigDecimal.ZERO)
                            .criadoEm(LocalDateTime.now())
                            .atualizadoEm(LocalDateTime.now())
                            .build();
                    clienteRepository.save(c);
                    inseridos++;
                }
            }
            if (inseridos > 0 || ignorados > 0 || erros > 0) {
                log.info("Importação de clientes: {} inseridos, {} já existentes, {} linhas ignoradas/erro.", inseridos, ignorados, erros);
            }
        } catch (Exception e) {
            log.error("Erro ao importar clientes de " + ARQUIVO, e);
        }
    }

    private static String apenasDigitos(String s) {
        if (s == null) return "";
        return s.replaceAll("\\D", "");
    }
}
