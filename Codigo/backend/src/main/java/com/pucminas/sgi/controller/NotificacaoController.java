package com.pucminas.sgi.controller;

import com.pucminas.sgi.dto.request.EnviarCobrancaRequestDTO;
import com.pucminas.sgi.dto.response.NotificacaoResponseDTO;
import com.pucminas.sgi.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notificacoes")
@Tag(name = "Notificações", description = "Envio de cobrança por email")
public class NotificacaoController {

    private final NotificationService notificationService;

    public NotificacaoController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @PostMapping("/enviar-cobranca")
    @Operation(summary = "Enviar email de cobrança")
    public ResponseEntity<NotificacaoResponseDTO> enviarCobranca(@Valid @RequestBody EnviarCobrancaRequestDTO dto) {
        NotificacaoResponseDTO response = notificationService.enviarCobrancaEmail(dto.getClienteId(), dto.getDividaId());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/cliente/{clienteId}")
    @Operation(summary = "Histórico de notificações do cliente")
    public ResponseEntity<List<NotificacaoResponseDTO>> historicoCliente(@PathVariable UUID clienteId) {
        List<NotificacaoResponseDTO> list = notificationService.consultarHistoricoNotificacoes(clienteId);
        return ResponseEntity.ok(list);
    }

    @PostMapping("/reprocessar-falhas")
    @Operation(summary = "Reenviar notificações com falha")
    public ResponseEntity<Map<String, Integer>> reprocessarFalhas() {
        int enviados = notificationService.reprocessarFalhas();
        return ResponseEntity.ok(Map.of("reenviados", enviados));
    }
}
