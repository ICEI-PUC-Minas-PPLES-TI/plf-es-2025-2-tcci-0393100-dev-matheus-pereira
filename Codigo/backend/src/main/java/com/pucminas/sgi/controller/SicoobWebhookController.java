package com.pucminas.sgi.controller;

import com.pucminas.sgi.service.SicoobWebhookService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Webhook Pix Sicoob (público; validar com X-Sicoob-Webhook-Secret se configurado).
 * O Sicoob pode chamar /api/sicoob/webhook/pix/pix conforme documentação — exponha a URL registrada.
 */
@RestController
@RequestMapping("/api/sicoob/webhook")
@Tag(name = "Sicoob Webhook", description = "Notificações Pix do Sicoob")
public class SicoobWebhookController {

    private final SicoobWebhookService webhookService;

    public SicoobWebhookController(SicoobWebhookService webhookService) {
        this.webhookService = webhookService;
    }

    @PostMapping({"/pix", "/pix/pix"})
    @Operation(summary = "Receber notificação de Pix recebido")
    public ResponseEntity<Void> webhookPix(
            @RequestHeader(value = "X-Sicoob-Webhook-Secret", required = false) String secret,
            @RequestBody String payload) {
        webhookService.validarSegredo(secret);
        webhookService.processarPixWebhook(payload);
        return ResponseEntity.ok().build();
    }
}
