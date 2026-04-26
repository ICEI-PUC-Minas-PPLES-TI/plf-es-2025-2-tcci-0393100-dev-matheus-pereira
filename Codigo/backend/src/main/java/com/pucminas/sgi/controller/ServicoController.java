package com.pucminas.sgi.controller;

import com.pucminas.sgi.dto.request.ServicoDTO;
import com.pucminas.sgi.dto.response.ServicoResponseDTO;
import com.pucminas.sgi.service.ServicoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/servicos")
@Tag(name = "Serviços", description = "Catálogo de serviços prestados pelo escritório")
public class ServicoController {

    private final ServicoService servicoService;

    public ServicoController(ServicoService servicoService) {
        this.servicoService = servicoService;
    }

    @GetMapping
    @Operation(summary = "Listar serviços ativos", description = "Retorna apenas serviços ativos, para uso em modal de seleção ao registrar dívida")
    public ResponseEntity<List<ServicoResponseDTO>> listarAtivos() {
        return ResponseEntity.ok(servicoService.listarAtivos());
    }

    @GetMapping("/todos")
    @Operation(summary = "Listar todos os serviços", description = "Inclui inativos (uso administrativo)")
    public ResponseEntity<List<ServicoResponseDTO>> listarTodos() {
        return ResponseEntity.ok(servicoService.listarTodos());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar serviço por ID")
    public ResponseEntity<ServicoResponseDTO> buscar(@PathVariable UUID id) {
        return ResponseEntity.ok(servicoService.buscarPorId(id));
    }

    @PostMapping
    @Operation(summary = "Criar novo serviço")
    public ResponseEntity<ServicoResponseDTO> criar(@Valid @RequestBody ServicoDTO dto) {
        ServicoResponseDTO created = servicoService.criar(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar serviço")
    public ResponseEntity<ServicoResponseDTO> atualizar(@PathVariable UUID id, @Valid @RequestBody ServicoDTO dto) {
        return ResponseEntity.ok(servicoService.atualizar(id, dto));
    }
}
