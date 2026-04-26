package com.pucminas.sgi.controller;

import com.pucminas.sgi.dto.request.DividaDTO;
import com.pucminas.sgi.dto.response.DividaResponseDTO;
import com.pucminas.sgi.enums.StatusDivida;
import com.pucminas.sgi.service.DividaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/dividas")
@Tag(name = "Dívidas", description = "Registro e consulta de dívidas")
public class DividaController {

    private final DividaService dividaService;

    public DividaController(DividaService dividaService) {
        this.dividaService = dividaService;
    }

    @PostMapping
    @Operation(summary = "Registrar nova dívida")
    public ResponseEntity<DividaResponseDTO> registrar(@Valid @RequestBody DividaDTO dto) {
        DividaResponseDTO response = dividaService.registrarDivida(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Consultar dívida")
    public ResponseEntity<DividaResponseDTO> consultar(@PathVariable UUID id) {
        DividaResponseDTO response = dividaService.consultarDivida(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @Operation(summary = "Listar dívidas com filtros")
    public ResponseEntity<Page<DividaResponseDTO>> listar(
            @RequestParam(required = false) UUID clienteId,
            @RequestParam(required = false) List<StatusDivida> status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodoInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodoFim,
            @PageableDefault(size = 20) Pageable pageable) {
        Page<DividaResponseDTO> page = dividaService.listarDividas(clienteId, status, periodoInicio, periodoFim, pageable);
        return ResponseEntity.ok(page);
    }

    @PutMapping("/{id}/status")
    @Operation(summary = "Forçar atualização de status da dívida")
    public ResponseEntity<Void> atualizarStatus(@PathVariable UUID id) {
        dividaService.atualizarStatusDivida(id);
        return ResponseEntity.ok().build();
    }
}
