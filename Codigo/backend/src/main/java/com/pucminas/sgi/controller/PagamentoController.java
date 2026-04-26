package com.pucminas.sgi.controller;

import com.pucminas.sgi.dto.request.PagamentoDTO;
import com.pucminas.sgi.dto.response.PagamentoResponseDTO;
import com.pucminas.sgi.dto.response.ReciboDTO;
import com.pucminas.sgi.service.PagamentoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/pagamentos")
@Tag(name = "Pagamentos")
public class PagamentoController {

    private final PagamentoService pagamentoService;

    public PagamentoController(PagamentoService pagamentoService) {
        this.pagamentoService = pagamentoService;
    }

    @PostMapping
    @Operation(summary = "Registrar pagamento")
    public ResponseEntity<ReciboDTO> registrar(@Valid @RequestBody PagamentoDTO dto) {
        ReciboDTO response = pagamentoService.registrarPagamento(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/divida/{dividaId}")
    @Operation(summary = "Listar pagamentos da dívida")
    public ResponseEntity<List<PagamentoResponseDTO>> listarPorDivida(@PathVariable UUID dividaId) {
        return ResponseEntity.ok(pagamentoService.listarPagamentosPorDivida(dividaId));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Consultar pagamento")
    public ResponseEntity<PagamentoResponseDTO> consultar(@PathVariable UUID id) {
        return ResponseEntity.ok(pagamentoService.consultarPagamento(id));
    }
}
