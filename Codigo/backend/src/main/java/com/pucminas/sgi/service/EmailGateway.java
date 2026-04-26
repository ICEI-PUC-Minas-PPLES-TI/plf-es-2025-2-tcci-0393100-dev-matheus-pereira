package com.pucminas.sgi.service;

import com.pucminas.sgi.entity.EmailConfig;
import com.pucminas.sgi.exception.EmailSendException;
import com.pucminas.sgi.repository.EmailConfigRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.Properties;

/**
 * Adapter para envio de emails via SMTP (JavaMailSender).
 * Configura a sessão a partir do EmailConfig do banco quando disponível.
 */
@Component
public class EmailGateway {

    private static final Logger log = LoggerFactory.getLogger(EmailGateway.class);

    private final EmailConfigRepository emailConfigRepository;
    private final JavaMailSender defaultMailSender;
    private JavaMailSenderImpl dynamicSender;

    @Autowired(required = false)
    public EmailGateway(EmailConfigRepository emailConfigRepository,
                        JavaMailSender defaultMailSender) {
        this.emailConfigRepository = emailConfigRepository;
        this.defaultMailSender = defaultMailSender;
    }

    /**
     * Configura a sessão de email a partir da configuração ativa no banco.
     */
    public void configurarSessao() {
        dynamicSender = null;
        emailConfigRepository.findFirstByAtivoTrue().ifPresent(config -> {
            JavaMailSenderImpl sender = new JavaMailSenderImpl();
            sender.setHost(config.getHost());
            sender.setPort(config.getPorta());
            sender.setUsername(config.getUsuario());
            sender.setPassword(config.getSenha());
            Properties props = sender.getJavaMailProperties();
            props.put("mail.smtp.auth", "true");
            props.put("mail.smtp.starttls.enable", config.getUsarTLS());
            dynamicSender = sender;
        });
    }

    /**
     * Envia email de cobrança/lembrete.
     */
    public void enviar(String destinatario, String assunto, String corpo, java.math.BigDecimal valorDevido) {
        JavaMailSender sender = obterSender();
        if (sender == null) {
            throw new EmailSendException("Nenhuma configuração SMTP ativa disponível para envio.");
        }
        String remetente = obterRemetente();
        String nomeRemetente = obterNomeRemetente();
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(nomeRemetente != null ? nomeRemetente + " <" + remetente + ">" : remetente);
        message.setTo(destinatario);
        message.setSubject(assunto);
        message.setText(corpo);
        try {
            sender.send(message);
            log.info("Email enviado para {} - assunto: {}", destinatario, assunto);
        } catch (Exception e) {
            log.error("Falha ao enviar email para {}: {}", destinatario, e.getMessage());
            throw new EmailSendException("Falha ao enviar email: " + e.getMessage(), e);
        }
    }

    private JavaMailSender obterSender() {
        configurarSessao();
        if (dynamicSender != null) {
            return dynamicSender;
        }
        return defaultMailSender;
    }

    private String obterRemetente() {
        return emailConfigRepository.findFirstByAtivoTrue()
                .map(EmailConfig::getEmailRemetente)
                .orElse(null);
    }

    private String obterNomeRemetente() {
        return emailConfigRepository.findFirstByAtivoTrue()
                .map(EmailConfig::getNomeRemetente)
                .orElse(null);
    }

    /**
     * Verifica se há configuração SMTP ativa.
     */
    public boolean hasConfigAtiva() {
        configurarSessao();
        return dynamicSender != null || defaultMailSender != null;
    }
}
