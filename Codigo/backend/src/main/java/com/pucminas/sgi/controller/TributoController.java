package com.pucminas.sgi.controller;

import com.pucminas.sgi.dto.request.CalcularTributoRequestDTO;
import com.pucminas.sgi.dto.request.ConsultaGeminiRequestDTO;
import com.pucminas.sgi.dto.request.CreditoTributoRequestDTO;
import com.pucminas.sgi.dto.request.NotaFiscalTributoRequestDTO;
import com.pucminas.sgi.dto.response.AliquotasResponseDTO;
import com.pucminas.sgi.dto.response.CalcularTributoResponseDTO;
import com.pucminas.sgi.dto.response.ConsultaGeminiResponseDTO;
import com.pucminas.sgi.dto.response.CreditoTributoResponseDTO;
import com.pucminas.sgi.dto.response.NotaFiscalTributoResponseDTO;
import com.pucminas.sgi.dto.response.RegimeCnpjResponseDTO;
import com.pucminas.sgi.service.CnpjConsultaService;
import com.pucminas.sgi.service.GeminiService;
import com.pucminas.sgi.service.TributoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Calculos da Reforma Tributaria (CBS/IBS) e consulta a IA (Gemini).
 */
@RestController
@RequestMapping("/api/tributos")
@Tag(name = "Tributos (Reforma Tributaria)", description = "Calculos CBS/IBS e consulta IA")
public class TributoController {

    private final TributoService tributoService;
    private final GeminiService geminiService;
    private final CnpjConsultaService cnpjConsultaService;

    public TributoController(TributoService tributoService,
                             GeminiService geminiService,
                             CnpjConsultaService cnpjConsultaService) {
        this.tributoService = tributoService;
        this.geminiService = geminiService;
        this.cnpjConsultaService = cnpjConsultaService;
    }

    @PostMapping("/calcular")
    @Operation(summary = "Calcular tributo", description = "Tipos: POR_DENTRO, POR_FORA, SEPARAR_CBS_IBS, MARGEM_LUCRO. Categoria: PLENO, REDUZIDO, ZERO.")
    public ResponseEntity<CalcularTributoResponseDTO> calcular(@Valid @RequestBody CalcularTributoRequestDTO request) {
        return ResponseEntity.ok(tributoService.calcular(request));
    }

    @GetMapping("/aliquotas/{categoria}")
    @Operation(summary = "Obter aliquotas por categoria", description = "categoria: PLENO, REDUZIDO ou ZERO")
    public ResponseEntity<AliquotasResponseDTO> getAliquotas(@PathVariable String categoria) {
        return ResponseEntity.ok(tributoService.getAliquotas(categoria));
    }

    @PostMapping("/creditos/validar")
    @Operation(summary = "Calcular credito tributario (nao-cumulatividade)")
    public ResponseEntity<CreditoTributoResponseDTO> validarCredito(@Valid @RequestBody CreditoTributoRequestDTO request) {
        return ResponseEntity.ok(tributoService.calcularComCredito(request));
    }

    @GetMapping("/regime/{cnpj}")
    @Operation(summary = "Consultar CNPJ e identificar regime", description = "Integra com API oficial de consulta CNPJ e retorna nome da empresa e regime tributario.")
    public ResponseEntity<RegimeCnpjResponseDTO> getRegime(@PathVariable String cnpj) {
        return ResponseEntity.ok(cnpjConsultaService.consultarRegime(cnpj));
    }

    @PostMapping("/nota-fiscal/gerar")
    @Operation(summary = "Calcular totais CBS/IBS de uma nota fiscal")
    public ResponseEntity<NotaFiscalTributoResponseDTO> gerarNotaFiscal(@Valid @RequestBody NotaFiscalTributoRequestDTO request) {
        return ResponseEntity.ok(tributoService.calcularNotaFiscal(request));
    }

    @PostMapping("/consulta-ia")
    @Operation(summary = "Consultar IA (Gemini) sobre reforma tributaria. Requer POST com body JSON: { pergunta, contexto? }.")
    public ResponseEntity<ConsultaGeminiResponseDTO> consultaGemini(@Valid @RequestBody ConsultaGeminiRequestDTO request) {
        try {
            String pergunta = request != null && request.getPergunta() != null ? request.getPergunta() : "";
            String contexto = request != null ? request.getContexto() : null;
            String resposta = geminiService.consultar(pergunta, contexto);
            return ResponseEntity.ok(ConsultaGeminiResponseDTO.builder()
                    .sucesso(true)
                    .resposta(resposta)
                    .build());
        } catch (Exception e) {
            return ResponseEntity.ok(ConsultaGeminiResponseDTO.builder()
                    .sucesso(false)
                    .resposta(null)
                    .erro("Erro ao processar consulta: " + e.getMessage())
                    .build());
        }
    }

    @GetMapping("/cashback")
    @Operation(summary = "Calcular cashback CBS (devolucao para baixa renda)")
    public ResponseEntity<java.util.Map<String, java.math.BigDecimal>> cashback(
            @RequestParam java.math.BigDecimal valorCompra,
            @RequestParam(required = false, defaultValue = "1.0") java.math.BigDecimal percentualDevolucao) {
        java.math.BigDecimal valor = tributoService.calcularCashback(valorCompra, percentualDevolucao);
        return ResponseEntity.ok(java.util.Map.of("cashbackCBS", valor));
    }
}
