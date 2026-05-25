package com.pucminas.sgi.config;

import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.repository.ClienteRepository;
import com.pucminas.sgi.util.TelefoneClienteUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Atualiza e-mails de clientes a partir de data/clientes-emails.csv (NOME;E-MAIL).
 * Executa após importação de clientes/serviços. Idempotente: não sobrescreve e-mail já igual.
 */
@Component
@Order(4)
public class ClientesEmailImportRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(ClientesEmailImportRunner.class);
    private static final String ARQUIVO = "data/clientes-emails.csv";

    private static final Map<String, String> MAPEAMENTO_NOME = new LinkedHashMap<>();

    static {
        MAPEAMENTO_NOME.put("AC FORCECIMENTO", "AC FORNECIMENTOS");
        MAPEAMENTO_NOME.put("ALEXANDRE ROD.", "WANDERSON ALEX RODRIGUES");
        MAPEAMENTO_NOME.put("ANA DIANNA", "GABRIELLA THOMAZ LAGES DIANA");
        MAPEAMENTO_NOME.put("ARTHUR ABREU", "ARTHUR SANTA BARBARA DE ABREU");
        MAPEAMENTO_NOME.put("BBR ENGENHARIA E CONSTRUCAO LTDA", "BBR ENGENHARIA E CONSTRUCAO");
        MAPEAMENTO_NOME.put("BJ-RESTAURANTE- COMERCIO & SERVICOS LTDA", "BJ-RESTAURANTE");
        MAPEAMENTO_NOME.put("CENTRO EDUCACIONAL MAMAE CORUJA LTDA", "CENTRO EDUCACIONAL MAMAE CORUJA");
        MAPEAMENTO_NOME.put("CG7 BUSINESS", "CG7 BUSINESS SOLUTIONS");
        MAPEAMENTO_NOME.put("COMERCIAL JPC", "COMERCIAL JPC");
        MAPEAMENTO_NOME.put("COMERCIAL SA", "COMERCIAL SA E OLIVEIRA");
        MAPEAMENTO_NOME.put("COOPERATIVA", "COOP AGROP");
        MAPEAMENTO_NOME.put("D/MAX EMP.", "D/MAX-CONSTRUCOES");
        MAPEAMENTO_NOME.put("DUVAL PIRES", "DUVAL DE FIGUEIREDO PIRES");
        MAPEAMENTO_NOME.put("EDUARDO BOAVENTURA LIMA FILHO E CIA LTDA", "EDUARDO BOAVENTURA LIMA FILHO");
        MAPEAMENTO_NOME.put("ERNANDO JOSE", "ERNANDO JOSE DE MATOS");
        MAPEAMENTO_NOME.put("FABYANO SILVA", "FABYANO SILVA DE OLIVEIRA");
        MAPEAMENTO_NOME.put("FERNANDO SANTOS", "FERNANDO SANTOS DA SILVA");
        MAPEAMENTO_NOME.put("GINO LUIZ", "GINO LUIS COSTA");
        MAPEAMENTO_NOME.put("HABITATECH ENG.", "HABITATECH ENGENHARIA");
        MAPEAMENTO_NOME.put("HOTELZINHO TIA PRI LTDA", "HOTELZINHO TIA PRI");
        MAPEAMENTO_NOME.put("HUMBERTO J.", "HUMBERTO JOSE DA SILVA GALVAO");
        MAPEAMENTO_NOME.put("IDEAL VISUAL", "IDEAL COMUNICACAO VISUAL");
        MAPEAMENTO_NOME.put("JACKELINE C.", "JACKELINE PEREIRA CIRINO SIMOES");
        MAPEAMENTO_NOME.put("JOSE RONALDO PIRES", "JOSE RONALDO PIRES PIMENTA");
        MAPEAMENTO_NOME.put("LEANDRO CAMILO", "LEANDRO CAMILO CARVALHO");
        MAPEAMENTO_NOME.put("LETICIA APARECIDA ASSUNCAO - ME", "LETICIA APARECIDA ASSUNCAO");
        MAPEAMENTO_NOME.put("LIGIA LIMA", "LIGIA LIMA RELOJOARIA");
        MAPEAMENTO_NOME.put("MARIA DA GRACA", "MARIA DA GRACA CARNEIRO FERREIRA");
        MAPEAMENTO_NOME.put("MERCEARIA ITACOLOMI LTDA", "MERCEARIA ITACOLOMI");
        MAPEAMENTO_NOME.put("PIMENTA PORTILHO", "PIMENTA PORTILHO FISIOTERAPIA");
        MAPEAMENTO_NOME.put("POR DO SOL CMD LTDA ME", "POR DO SOL CMD");
        MAPEAMENTO_NOME.put("POUSADA E RESTAURANTE KAYUA LTDA", "POUSADA E RESTAURANTE KAYUA");
        MAPEAMENTO_NOME.put("POUSADA ESTRADA VELHA LTDA", "POUSADA ESTRADA VELHA");
        MAPEAMENTO_NOME.put("QUARTO MASCARENHAS COM E LOC VEICULOS LTDA", "QUARTO MASCARENHAS");
        MAPEAMENTO_NOME.put("RESTAURANTE MONTE CASTELO LTDA", "RESTAURANTE MONTE CASTELO");
        MAPEAMENTO_NOME.put("RLC AGROPECUARIA", "RLC AGROPECUARIA");
        MAPEAMENTO_NOME.put("RUI AIRES PINTO TRANSPORTES LTDA", "RUI AIRES PINTO TRANSPORTES");
        MAPEAMENTO_NOME.put("SANDEY ROGERIO", "SANDEY ROGERIO APARECIDO");
        MAPEAMENTO_NOME.put("SOLARIO", "SOLARIO BOUTIQUE");
        MAPEAMENTO_NOME.put("SORRIA CLINICA", "SORRIA-CLINICA DENTARIA");
        MAPEAMENTO_NOME.put("THAIS SIMOES", "THAIS SIMOES SOCIEDADE");
        MAPEAMENTO_NOME.put("THIAGO LEAO", "THIAGO DE ALMEIDA LEAO");
        MAPEAMENTO_NOME.put("TRANSPORTE ESCOLAR SOUZA OTONI LTDA -ME", "TRANSPORTE ESCOLAR SOUZA OTONI");
        MAPEAMENTO_NOME.put("WANDER ROSA", "WANDER ROSA DE SANTANA");
    }

    private final ClienteRepository clienteRepository;

    public ClientesEmailImportRunner(ClienteRepository clienteRepository) {
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
            int atualizados = 0;
            int ignorados = 0;
            int semCliente = 0;
            int invalidos = 0;

            try (var reader = new BufferedReader(
                    new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    line = line.trim();
                    if (line.isEmpty() || line.regionMatches(true, 0, "NOME DA EMPRESA", 0, 15)) {
                        continue;
                    }
                    int idx = line.indexOf(';');
                    if (idx <= 0) {
                        invalidos++;
                        continue;
                    }
                    String nomePlanilha = line.substring(0, idx).trim();
                    String emailRaw = line.substring(idx + 1).trim();
                    String email = normalizarEmail(emailRaw);
                    if (email == null) {
                        continue;
                    }
                    String fragmento = MAPEAMENTO_NOME.get(nomePlanilha);
                    if (fragmento == null) {
                        semCliente++;
                        continue;
                    }
                    List<Cliente> matches = clienteRepository
                            .findByNomeContainingIgnoreCase(fragmento, Pageable.unpaged())
                            .getContent();
                    if (matches.isEmpty()) {
                        semCliente++;
                        continue;
                    }
                    Cliente cliente = matches.get(0);
                    if (matches.size() > 1) {
                        log.warn("Vários clientes para '{}', usando: {}", nomePlanilha, cliente.getNome());
                    }
                    if (email.equalsIgnoreCase(
                            cliente.getEmail() != null ? cliente.getEmail().trim() : "")) {
                        ignorados++;
                        continue;
                    }
                    cliente.setEmail(email);
                    cliente.setAtualizadoEm(LocalDateTime.now());
                    clienteRepository.save(cliente);
                    atualizados++;
                }
            }
            if (atualizados > 0 || semCliente > 0 || invalidos > 0) {
                log.info("Importação de e-mails: {} atualizados, {} já iguais, {} sem cliente no cadastro.",
                        atualizados, ignorados, semCliente);
            }
        } catch (Exception e) {
            log.error("Erro ao importar e-mails de " + ARQUIVO, e);
        }
    }

    private static String normalizarEmail(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String email = raw.split("/")[0].trim();
        email = email.replace("autlook.com", "outlook.com");
        try {
            return TelefoneClienteUtil.normalizarEValidarEmail(email);
        } catch (Exception e) {
            log.warn("E-mail inválido ignorado: {}", email);
            return null;
        }
    }
}
