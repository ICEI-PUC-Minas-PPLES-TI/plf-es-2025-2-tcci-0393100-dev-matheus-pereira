package com.pucminas.sgi.controller;

import com.pucminas.sgi.dto.response.ExtratoClienteDTO;
import com.pucminas.sgi.dto.response.AgingReportDTO;
import com.pucminas.sgi.dto.response.EfetividadeCobrancaDTO;
import com.pucminas.sgi.dto.response.RankingDevedoresDTO;
import com.pucminas.sgi.dto.response.RelatorioInadimplentesDTO;
import com.pucminas.sgi.dto.response.ResumoFinanceiroDTO;
import com.pucminas.sgi.dto.response.ResumoRelatorioDTO;
import com.pucminas.sgi.enums.StatusDivida;
import com.pucminas.sgi.service.RelatorioService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.core.io.Resource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/relatorios")
@Tag(name = "Relatórios")
public class RelatorioController {

    private final RelatorioService relatorioService;

    public RelatorioController(RelatorioService relatorioService) {
        this.relatorioService = relatorioService;
    }

    @GetMapping("/resumo")
    @Operation(summary = "Resumo para dashboard (totalClientes, totalDividas, totalEmAberto, totalPago)")
    public ResponseEntity<ResumoRelatorioDTO> resumo(@RequestParam(required = false) Integer dias) {
        return ResponseEntity.ok(relatorioService.gerarResumo(dias));
    }

    @GetMapping("/ranking-devedores")
    @Operation(summary = "Ranking de maiores devedores (contrato frontend)")
    public ResponseEntity<RankingDevedoresDTO> rankingDevedores(
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String periodo,
            @RequestParam(required = false) java.math.BigDecimal valorMin,
            @RequestParam(required = false) Integer qtdDividas,
            @RequestParam(required = false) Integer diasAtraso) {
        int limite = (limit != null && limit > 0) ? limit : 10;
        return ResponseEntity.ok(relatorioService.gerarRankingMaioresDevedores(limite));
    }

    @GetMapping("/inadimplentes")
    @Operation(summary = "Relatório inadimplentes")
    public ResponseEntity<RelatorioInadimplentesDTO> inadimplentes(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodoInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodoFim,
            @RequestParam(required = false) List<StatusDivida> filtros) {
        return ResponseEntity.ok(relatorioService.gerarRelatorioInadimplentes(periodoInicio, periodoFim, filtros));
    }

    @GetMapping("/ranking")
    @Operation(summary = "Ranking devedores")
    public ResponseEntity<RankingDevedoresDTO> ranking(@RequestParam(defaultValue = "10") int limite) {
        return ResponseEntity.ok(relatorioService.gerarRankingMaioresDevedores(limite));
    }

    @GetMapping("/extrato-cliente/{id}")
    @Operation(summary = "Extrato por cliente (dívidas ativas, pagamentos, notificações)")
    public ResponseEntity<ExtratoClienteDTO> extratoCliente(@PathVariable UUID id) {
        return ResponseEntity.ok(relatorioService.gerarExtratoCliente(id));
    }

    @GetMapping("/inadimplencia-periodo")
    @Operation(summary = "Inadimplência por período (dataInicio, dataFim)")
    public ResponseEntity<RelatorioInadimplentesDTO> inadimplenciaPeriodo(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim) {
        return ResponseEntity.ok(relatorioService.gerarRelatorioInadimplentes(dataInicio, dataFim, null));
    }

    @GetMapping("/resumo-financeiro")
    @Operation(summary = "Resumo financeiro")
    public ResponseEntity<ResumoFinanceiroDTO> resumo(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodoInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodoFim) {
        return ResponseEntity.ok(relatorioService.gerarResumoFinanceiro(periodoInicio, periodoFim));
    }

    @GetMapping("/aging")
    @Operation(summary = "Aging report por faixa de atraso (0-30, 31-60, 61-90, +90)")
    public ResponseEntity<AgingReportDTO> aging() {
        return ResponseEntity.ok(relatorioService.gerarAgingReport());
    }

    @GetMapping("/efetividade-cobranca")
    @Operation(summary = "Efetividade de cobrança por mês (envios x pagamentos)")
    public ResponseEntity<EfetividadeCobrancaDTO> efetividadeCobranca(
            @RequestParam(required = false) Integer ano,
            @RequestParam(required = false) Integer mes) {
        return ResponseEntity.ok(relatorioService.gerarEfetividadeCobranca(ano, mes));
    }

    @GetMapping("/exportar/{tipo}")
    @Operation(summary = "Exportar PDF ou Excel")
    public ResponseEntity<Resource> exportar(
            @PathVariable String tipo,
            @RequestParam(defaultValue = "inadimplentes") String relatorio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodoInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodoFim) {
        LocalDate inicio = periodoInicio != null ? periodoInicio : LocalDate.now().minusMonths(1);
        LocalDate fim = periodoFim != null ? periodoFim : LocalDate.now();
        Resource resource;
        String filename;
        MediaType mediaType;
        if ("pdf".equalsIgnoreCase(tipo)) {
            resource = relatorioService.exportarRelatorioPDF(relatorio, inicio, fim);
            filename = "relatorio-" + relatorio + ".pdf";
            mediaType = MediaType.APPLICATION_PDF;
        } else if ("excel".equalsIgnoreCase(tipo)) {
            resource = relatorioService.exportarRelatorioExcel(relatorio, inicio, fim);
            filename = "relatorio-" + relatorio + ".xlsx";
            mediaType = MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        } else {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(resource);
    }
}
