package com.pucminas.sgi.controller;

import com.pucminas.sgi.dto.request.AgendamentoDTO;
import com.pucminas.sgi.dto.response.AgendamentoResponseDTO;
import com.pucminas.sgi.service.AgendamentoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/agendamentos")
@Tag(name = "Agendamentos", description = "Agendamento de lembretes por email")
public class AgendamentoController {

    private final AgendamentoService agendamentoService;

    public AgendamentoController(AgendamentoService agendamentoService) {
        this.agendamentoService = agendamentoService;
    }

    @PostMapping
    @Operation(summary = "Criar agendamento")
    public ResponseEntity<AgendamentoResponseDTO> criar(@Valid @RequestBody AgendamentoDTO dto) {
        AgendamentoResponseDTO response = agendamentoService.criarAgendamento(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @Operation(summary = "Listar agendamentos")
    public ResponseEntity<List<AgendamentoResponseDTO>> listar() {
        List<AgendamentoResponseDTO> list = agendamentoService.listarAgendamentos();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Consultar agendamento")
    public ResponseEntity<AgendamentoResponseDTO> consultar(@PathVariable UUID id) {
        AgendamentoResponseDTO response = agendamentoService.consultarAgendamento(id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar agendamento")
    public ResponseEntity<AgendamentoResponseDTO> atualizar(@PathVariable UUID id, @Valid @RequestBody AgendamentoDTO dto) {
        AgendamentoResponseDTO response = agendamentoService.atualizarAgendamento(id, dto);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/ativar")
    @Operation(summary = "Ativar ou desativar agendamento")
    public ResponseEntity<Void> ativar(@PathVariable UUID id, @RequestParam boolean ativo) {
        agendamentoService.ativarDesativarAgendamento(id, ativo);
        return ResponseEntity.ok().build();
    }
}
