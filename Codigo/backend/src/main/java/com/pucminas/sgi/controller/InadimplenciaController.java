package com.pucminas.sgi.controller;

import com.pucminas.sgi.dto.request.InadimplenciaPayloadDTO;
import com.pucminas.sgi.dto.request.InadimplenciaStatusDTO;
import com.pucminas.sgi.dto.response.InadimplenciaResponseDTO;
import com.pucminas.sgi.service.InadimplenciaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.UUID;

/**
 * API de inadimplências (contrato frontend): listagem, criação e confirmação de pagamento.
 */
@RestController
@RequestMapping("/api/inadimplentes")
@Tag(name = "Inadimplentes", description = "Listagem e registro de inadimplências (dívidas)")
public class InadimplenciaController {

    private static final Logger log = LoggerFactory.getLogger(InadimplenciaController.class);
    private final InadimplenciaService inadimplenciaService;

    public InadimplenciaController(InadimplenciaService inadimplenciaService) {
        this.inadimplenciaService = inadimplenciaService;
    }

    @GetMapping
    @Operation(summary = "Listar inadimplências")
    public ResponseEntity<Object> listar(@PageableDefault(size = 50) Pageable pageable,
                                        @RequestParam(required = false) Boolean paginado) {
        if (Boolean.TRUE.equals(paginado)) {
            Page<InadimplenciaResponseDTO> page = inadimplenciaService.listar(pageable);
            return ResponseEntity.ok(page);
        }
        List<InadimplenciaResponseDTO> list = inadimplenciaService.listarTodas();
        return ResponseEntity.ok(list);
    }

    @PostMapping
    @Operation(summary = "Registrar inadimplência (nova dívida)")
    public ResponseEntity<InadimplenciaResponseDTO> criar(@Valid @RequestBody InadimplenciaPayloadDTO payload) {
        InadimplenciaResponseDTO response = inadimplenciaService.criar(payload);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Confirmar pagamento (status: Pago) ou retornar inadimplência")
    public ResponseEntity<InadimplenciaResponseDTO> atualizarStatus(@PathVariable UUID id,
                                                                     @RequestBody(required = false) InadimplenciaStatusDTO body) {
        if (body != null && "Pago".equalsIgnoreCase(body.getStatus())) {
            InadimplenciaResponseDTO response = inadimplenciaService.confirmarPagamento(id, body);
            return ResponseEntity.ok(response);
        }
        // Se o corpo não indicar "Pago", apenas retorna o registro atual sem erro 400.
        InadimplenciaResponseDTO atual = inadimplenciaService.consultar(id);
        return ResponseEntity.ok(atual);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Cancelar inadimplência (soft delete – não aparece mais na listagem)")
    public ResponseEntity<Void> cancelar(@PathVariable UUID id) {
        try {
            inadimplenciaService.cancelar(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("Erro ao cancelar inadimplência (DELETE /api/inadimplentes/{}): ", id, e);
            throw e;
        }
    }
}
