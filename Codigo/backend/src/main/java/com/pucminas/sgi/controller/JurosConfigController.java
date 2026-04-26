package com.pucminas.sgi.controller;

import com.pucminas.sgi.dto.response.JurosConfigDTO;
import com.pucminas.sgi.entity.JurosConfig;
import com.pucminas.sgi.service.JurosConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/config/juros")
@Tag(name = "Configuração de Juros", description = "Taxas de multa e juros aplicadas às dívidas")
public class JurosConfigController {

    private final JurosConfigService jurosConfigService;

    public JurosConfigController(JurosConfigService jurosConfigService) {
        this.jurosConfigService = jurosConfigService;
    }

    @GetMapping
    @Operation(summary = "Obter configuração de juros")
    public ResponseEntity<JurosConfigDTO> get() {
        JurosConfig cfg = jurosConfigService.getAtual();
        JurosConfigDTO dto = JurosConfigDTO.builder()
                .multaDiaria(cfg.getMultaDiaria())
                .capMultaPercentual(cfg.getCapMultaPercentual())
                .jurosMensal(cfg.getJurosMensal())
                .build();
        return ResponseEntity.ok(dto);
    }

    @PutMapping
    @Operation(summary = "Atualizar configuração de juros")
    public ResponseEntity<JurosConfigDTO> atualizar(@RequestBody JurosConfigDTO body) {
        JurosConfig cfg = jurosConfigService.atualizar(body);
        JurosConfigDTO dto = JurosConfigDTO.builder()
                .multaDiaria(cfg.getMultaDiaria())
                .capMultaPercentual(cfg.getCapMultaPercentual())
                .jurosMensal(cfg.getJurosMensal())
                .build();
        return ResponseEntity.ok(dto);
    }
}

