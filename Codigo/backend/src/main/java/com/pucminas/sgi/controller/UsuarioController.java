package com.pucminas.sgi.controller;

import com.pucminas.sgi.dto.request.CadastroUsuarioDTO;
import com.pucminas.sgi.dto.response.UsuarioResponseDTO;
import com.pucminas.sgi.service.UsuarioService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/usuarios")
@Tag(name = "Usuários", description = "Cadastro de usuários")
public class UsuarioController {

    private final UsuarioService usuarioService;

    public UsuarioController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @PostMapping
    @Operation(summary = "Cadastrar usuário")
    public ResponseEntity<Void> cadastrar(@Valid @RequestBody CadastroUsuarioDTO dto) {
        usuarioService.cadastrar(dto);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @GetMapping("/pendentes")
    @Operation(summary = "Listar cadastros pendentes de aprovação")
    public ResponseEntity<List<UsuarioResponseDTO>> listarPendentes() {
        return ResponseEntity.ok(usuarioService.listarPendentes());
    }

    @GetMapping("/ativos")
    @Operation(summary = "Listar usuários com status ativo (somente proprietária)")
    public ResponseEntity<List<UsuarioResponseDTO>> listarAtivos(Authentication authentication) {
        UUID solicitanteId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(usuarioService.listarAtivos(solicitanteId));
    }

    @PatchMapping("/{id}/aprovar")
    @Operation(summary = "Aprovar cadastro de usuário pendente (somente proprietária)")
    public ResponseEntity<UsuarioResponseDTO> aprovar(@PathVariable UUID id, Authentication authentication) {
        UUID aprovadorId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(usuarioService.aprovarCadastro(id, aprovadorId));
    }

    @PatchMapping("/{id}/revogar")
    @Operation(summary = "Revogar acesso de usuário ativo (somente proprietária; define INATIVO)")
    public ResponseEntity<UsuarioResponseDTO> revogar(@PathVariable UUID id, Authentication authentication) {
        UUID revogadorId = (UUID) authentication.getPrincipal();
        return ResponseEntity.ok(usuarioService.revogarAcesso(id, revogadorId));
    }
}
