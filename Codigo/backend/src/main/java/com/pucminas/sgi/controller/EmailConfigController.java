package com.pucminas.sgi.controller;

import com.pucminas.sgi.dto.request.EmailConfigDTO;
import com.pucminas.sgi.dto.response.EmailConfigResponseDTO;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.service.EmailConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/email-config")
@Tag(name = "Configuração de Email", description = "Configuração SMTP e teste de envio")
public class EmailConfigController {

    private final EmailConfigService emailConfigService;

    public EmailConfigController(EmailConfigService emailConfigService) {
        this.emailConfigService = emailConfigService;
    }

    @PostMapping
    @Operation(summary = "Criar ou atualizar configuração SMTP")
    public ResponseEntity<EmailConfigResponseDTO> salvar(@Valid @RequestBody EmailConfigDTO dto) {
        EmailConfigResponseDTO response = emailConfigService.salvarConfig(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @Operation(summary = "Consultar configuração ativa")
    public ResponseEntity<EmailConfigResponseDTO> consultar() {
        return emailConfigService.consultarConfigAtiva()
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException("Configuração de email ativa não encontrada"));
    }

    @PostMapping("/testar")
    @Operation(summary = "Testar envio de email com configuração atual")
    public ResponseEntity<Map<String, Boolean>> testar(@RequestParam(required = false) String email) {
        String destino = email != null && !email.isBlank() ? email : "teste@sgi.local";
        boolean sucesso = emailConfigService.testarEnvio(destino);
        return ResponseEntity.ok(Map.of("enviado", sucesso));
    }
}
