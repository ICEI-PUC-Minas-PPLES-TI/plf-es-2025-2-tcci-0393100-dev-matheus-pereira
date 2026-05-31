package com.pucminas.sgi.controller;

import com.pucminas.sgi.dto.response.CobrancaSicoobResponseDTO;
import com.pucminas.sgi.dto.response.SicoobStatusResponseDTO;
import com.pucminas.sgi.service.SicoobCobrancaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/sicoob")
@Tag(name = "Sicoob", description = "Cobrança Pix e boleto via API Sicoob")
public class SicoobController {

    private final SicoobCobrancaService sicoobCobrancaService;

    public SicoobController(SicoobCobrancaService sicoobCobrancaService) {
        this.sicoobCobrancaService = sicoobCobrancaService;
    }

    @GetMapping("/status")
    @Operation(summary = "Status da integração Sicoob")
    public ResponseEntity<SicoobStatusResponseDTO> status() {
        return ResponseEntity.ok(sicoobCobrancaService.status());
    }

    @PostMapping("/dividas/{dividaId}/pix")
    @Operation(summary = "Emitir cobrança Pix imediata para a dívida")
    public ResponseEntity<CobrancaSicoobResponseDTO> emitirPix(@PathVariable UUID dividaId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sicoobCobrancaService.emitirPix(dividaId));
    }

    @PostMapping("/dividas/{dividaId}/boleto")
    @Operation(summary = "Emitir boleto (Cobrança Bancária v3) para a dívida")
    public ResponseEntity<CobrancaSicoobResponseDTO> emitirBoleto(@PathVariable UUID dividaId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sicoobCobrancaService.emitirBoleto(dividaId));
    }

    @GetMapping("/dividas/{dividaId}/cobrancas")
    @Operation(summary = "Listar cobranças Sicoob da dívida")
    public ResponseEntity<List<CobrancaSicoobResponseDTO>> listar(@PathVariable UUID dividaId) {
        return ResponseEntity.ok(sicoobCobrancaService.listarPorDivida(dividaId));
    }

    @GetMapping("/cobrancas/{cobrancaId}")
    @Operation(summary = "Consultar cobrança Sicoob")
    public ResponseEntity<CobrancaSicoobResponseDTO> consultar(@PathVariable UUID cobrancaId) {
        return ResponseEntity.ok(sicoobCobrancaService.consultar(cobrancaId));
    }
}
