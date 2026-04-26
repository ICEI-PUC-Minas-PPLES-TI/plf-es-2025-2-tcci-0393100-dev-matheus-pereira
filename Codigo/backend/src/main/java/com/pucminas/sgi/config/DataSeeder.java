package com.pucminas.sgi.config;

import com.pucminas.sgi.entity.EmailConfig;
import com.pucminas.sgi.entity.Servico;
import com.pucminas.sgi.entity.Usuario;
import com.pucminas.sgi.enums.Perfil;
import com.pucminas.sgi.enums.StatusUsuario;
import com.pucminas.sgi.repository.EmailConfigRepository;
import com.pucminas.sgi.repository.ServicoRepository;
import com.pucminas.sgi.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Popula apenas usuários de login e configuração de e-mail.
 * Clientes e dívidas vêm do import (ClientesImportRunner) ou do uso da API.
 */
@Component
@Profile("!test")
@Order(1)
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final UsuarioRepository usuarioRepository;
    private final EmailConfigRepository emailConfigRepository;
    private final ServicoRepository servicoRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UsuarioRepository usuarioRepository,
                      EmailConfigRepository emailConfigRepository,
                      ServicoRepository servicoRepository,
                      PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.emailConfigRepository = emailConfigRepository;
        this.servicoRepository = servicoRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (usuarioRepository.count() > 0) {
            log.info("Dados já existem, pulando seed.");
            atualizarLoginResponsavelFinanceiroSeExistir();
            atualizarLoginProprietariaSeExistir();
            atualizarSenhaProprietariaSeExistir();
            removerServicosSeedAntigos();
            seedServicosSeVazio();
            return;
        }
        log.info("Iniciando seed de dados...");

        Usuario admin = Usuario.builder()
                .telefone("josecarlos")
                .senha(passwordEncoder.encode("484659"))
                .nome("Responsável Financeiro")
                .perfil(Perfil.RESPONSAVEL_FINANCEIRO)
                .statusUsuario(StatusUsuario.ATIVO)
                .build();
        usuarioRepository.save(admin);

        Usuario prop = Usuario.builder()
                .telefone("claudia")
                .senha(passwordEncoder.encode("2527"))
                .nome("Proprietária")
                .perfil(Perfil.PROPRIETARIA)
                .statusUsuario(StatusUsuario.ATIVO)
                .build();
        usuarioRepository.save(prop);

        EmailConfig emailConfig = EmailConfig.builder()
                .host("smtp.gmail.com")
                .porta(587)
                .usuario("")
                .senha("")
                .usarTLS(true)
                .emailRemetente("noreply@escritorio.com")
                .nomeRemetente("Escritório Contábil")
                .ativo(false)
                .atualizadoEm(LocalDateTime.now())
                .build();
        emailConfigRepository.save(emailConfig);

        removerServicosSeedAntigos();
        seedServicosSeVazio();
        log.info("Seed concluído: 2 usuários, 1 config email, serviços. Clientes vêm do import.");
    }

    /**
     * Remove os serviços genéricos criados pelas versões antigas do seed
     * (Escrituração Contábil Mensal, Folha de Pagamento, etc.).
     * Assim, apenas o catálogo vindo do arquivo servicos-importar.txt permanece.
     */
    private void removerServicosSeedAntigos() {
        String[] nomesAntigos = {
                "Escrituração Contábil Mensal",
                "Folha de Pagamento",
                "Impostos e Obrigações Fiscais",
                "Abertura e Alteração de Empresas",
                "Consultoria Contábil"
        };
        for (String nome : nomesAntigos) {
            servicoRepository.findByNome(nome).ifPresent(s -> {
                servicoRepository.delete(s);
                log.info("Serviço seed antigo removido: {}", nome);
            });
        }
    }

    /**
     * Popula o catálogo de serviços do escritório se a tabela estiver vazia.
     * A partir de agora não cria mais os 5 serviços genéricos; a ideia é
     * que o catálogo venha do arquivo servicos-importar.txt (ServicosImportRunner).
     */
    private void seedServicosSeVazio() {
        if (servicoRepository.count() > 0) return;
        log.info("Tabela de serviços vazia. Catálogo será preenchido via ServicosImportRunner (arquivo data/servicos-importar.txt).");
    }

    /** Atualiza o usuário Responsável Financeiro antigo (31999999999) para login josecarlos e senha 484659. */
    private void atualizarLoginResponsavelFinanceiroSeExistir() {
        usuarioRepository.findByTelefone("31999999999").ifPresent(u -> {
            u.setTelefone("josecarlos");
            u.setSenha(passwordEncoder.encode("484659"));
            usuarioRepository.save(u);
            log.info("Login/senha do Responsável Financeiro atualizado para josecarlos/484659.");
        });
    }

    /** Atualiza o usuário Proprietária antigo (31988888888) para login claudia e senha 2527. */
    private void atualizarLoginProprietariaSeExistir() {
        usuarioRepository.findByTelefone("31988888888").ifPresent(u -> {
            u.setTelefone("claudia");
            u.setSenha(passwordEncoder.encode("2527"));
            usuarioRepository.save(u);
            log.info("Login/senha da Proprietária atualizado para claudia/2527.");
        });
    }

    /** Atualiza a senha da Proprietária (claudia) para 2527 se já existir. */
    private void atualizarSenhaProprietariaSeExistir() {
        usuarioRepository.findByTelefone("claudia").ifPresent(u -> {
            u.setSenha(passwordEncoder.encode("2527"));
            usuarioRepository.save(u);
            log.info("Senha da Proprietária (claudia) atualizada para 2527.");
        });
    }
}
