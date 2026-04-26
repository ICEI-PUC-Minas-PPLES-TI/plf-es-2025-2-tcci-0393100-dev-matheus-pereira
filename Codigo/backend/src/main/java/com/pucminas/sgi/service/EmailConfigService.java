package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.request.EmailConfigDTO;
import com.pucminas.sgi.dto.response.EmailConfigResponseDTO;
import com.pucminas.sgi.entity.EmailConfig;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.repository.EmailConfigRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class EmailConfigService {

    private static final Logger log = LoggerFactory.getLogger(EmailConfigService.class);

    private final EmailConfigRepository emailConfigRepository;
    private final EmailGateway emailGateway;

    public EmailConfigService(EmailConfigRepository emailConfigRepository, EmailGateway emailGateway) {
        this.emailConfigRepository = emailConfigRepository;
        this.emailGateway = emailGateway;
    }

    @Transactional
    public EmailConfigResponseDTO salvarConfig(EmailConfigDTO dto) {
        Optional<EmailConfig> existente = emailConfigRepository.findFirstByAtivoTrue();
        EmailConfig c;
        if (existente.isPresent()) {
            c = existente.get();
            c.setHost(dto.getHost());
            c.setPorta(dto.getPorta());
            c.setUsuario(dto.getUsuario());
            if (dto.getSenha() != null && !dto.getSenha().isBlank()) {
                c.setSenha(dto.getSenha());
            }
            c.setUsarTLS(dto.getUsarTLS());
            c.setEmailRemetente(dto.getEmailRemetente());
            c.setNomeRemetente(dto.getNomeRemetente());
            c.setAtivo(dto.getAtivo());
            c.setAtualizadoEm(LocalDateTime.now());
        } else {
            c = EmailConfig.builder()
                    .host(dto.getHost())
                    .porta(dto.getPorta())
                    .usuario(dto.getUsuario())
                    .senha(dto.getSenha())
                    .usarTLS(dto.getUsarTLS())
                    .emailRemetente(dto.getEmailRemetente())
                    .nomeRemetente(dto.getNomeRemetente())
                    .ativo(dto.getAtivo())
                    .atualizadoEm(LocalDateTime.now())
                    .build();
        }
        c = emailConfigRepository.save(c);
        emailGateway.configurarSessao();
        log.info("Configuração de email salva: {}", c.getConfigId());
        return toResponse(c);
    }

    @Transactional(readOnly = true)
    public Optional<EmailConfigResponseDTO> consultarConfigAtiva() {
        return emailConfigRepository.findFirstByAtivoTrue().map(this::toResponse);
    }

    public boolean testarEnvio(String emailTeste) {
        emailGateway.configurarSessao();
        if (!emailGateway.hasConfigAtiva()) {
            return false;
        }
        try {
            emailGateway.enviar(emailTeste, "Teste SGI", "Email de teste do Sistema de Gerenciamento de Inadimplentes.", java.math.BigDecimal.ZERO);
            return true;
        } catch (Exception e) {
            log.warn("Falha no teste de envio: {}", e.getMessage());
            return false;
        }
    }

    private EmailConfigResponseDTO toResponse(EmailConfig c) {
        return EmailConfigResponseDTO.builder()
                .configId(c.getConfigId())
                .host(c.getHost())
                .porta(c.getPorta())
                .usuario(c.getUsuario())
                .emailRemetente(c.getEmailRemetente())
                .nomeRemetente(c.getNomeRemetente())
                .usarTLS(c.getUsarTLS())
                .ativo(c.getAtivo())
                .atualizadoEm(c.getAtualizadoEm())
                .build();
    }
}
