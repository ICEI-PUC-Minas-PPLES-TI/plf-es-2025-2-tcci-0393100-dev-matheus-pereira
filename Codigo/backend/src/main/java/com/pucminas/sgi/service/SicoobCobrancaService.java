package com.pucminas.sgi.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.pucminas.sgi.config.SicoobProperties;
import com.pucminas.sgi.dto.response.CobrancaSicoobResponseDTO;
import com.pucminas.sgi.dto.response.SicoobStatusResponseDTO;
import com.pucminas.sgi.entity.CobrancaSicoob;
import com.pucminas.sgi.entity.Divida;
import com.pucminas.sgi.enums.StatusCobrancaSicoob;
import com.pucminas.sgi.enums.TipoCobrancaSicoob;
import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.exception.SicoobApiException;
import com.pucminas.sgi.integration.sicoob.SicoobBoletoClient;
import com.pucminas.sgi.integration.sicoob.SicoobPixClient;
import com.pucminas.sgi.repository.CobrancaSicoobRepository;
import com.pucminas.sgi.repository.DividaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class SicoobCobrancaService {

    private static final Logger log = LoggerFactory.getLogger(SicoobCobrancaService.class);

    private final SicoobProperties properties;
    private final DividaRepository dividaRepository;
    private final CobrancaSicoobRepository cobrancaRepository;
    private final SicoobPixClient pixClient;
    private final SicoobBoletoClient boletoClient;

    public SicoobCobrancaService(SicoobProperties properties,
                                 DividaRepository dividaRepository,
                                 CobrancaSicoobRepository cobrancaRepository,
                                 SicoobPixClient pixClient,
                                 SicoobBoletoClient boletoClient) {
        this.properties = properties;
        this.dividaRepository = dividaRepository;
        this.cobrancaRepository = cobrancaRepository;
        this.pixClient = pixClient;
        this.boletoClient = boletoClient;
    }

    public SicoobStatusResponseDTO status() {
        return SicoobStatusResponseDTO.builder()
                .enabled(properties.isEnabled())
                .mock(properties.isMock())
                .configuredForApi(properties.isConfiguredForApi())
                .mensagem(properties.isEnabled()
                        ? (properties.isMock()
                        ? "Modo mock ativo — cobranças simuladas sem certificado."
                        : (properties.isConfiguredForApi()
                        ? "Integração Sicoob configurada para APIs reais."
                        : "Defina client-id e certificate-path para APIs reais."))
                        : "Integração Sicoob desabilitada (sicoob.enabled=false).")
                .build();
    }

    @Transactional
    public CobrancaSicoobResponseDTO emitirPix(UUID dividaId) {
        garantirHabilitado();
        Divida divida = carregarDivida(dividaId);
        validarSaldoDevedor(divida);

        String txid = gerarTxid(divida);
        CobrancaSicoob cobranca = CobrancaSicoob.builder()
                .divida(divida)
                .tipo(TipoCobrancaSicoob.PIX)
                .valorCentavos(divida.getValorDevedor())
                .pixTxid(txid)
                .status(StatusCobrancaSicoob.PENDENTE)
                .build();

        try {
            JsonNode resposta = pixClient.criarCobrancaImediata(divida, txid);
            preencherPix(cobranca, resposta);
            registrarWebhookSeConfigurado();
        } catch (Exception e) {
            cobranca.setStatus(StatusCobrancaSicoob.ERRO);
            cobranca.setMensagemErro(e.getMessage());
            cobrancaRepository.save(cobranca);
            if (e instanceof SicoobApiException s) {
                throw s;
            }
            throw new SicoobApiException("Falha ao emitir Pix: " + e.getMessage(), e);
        }

        cobranca = cobrancaRepository.save(cobranca);
        log.info("Cobrança Pix Sicoob {} para dívida {}", cobranca.getCobrancaId(), divida.getProtocolo());
        return toDto(cobranca, divida);
    }

    @Transactional
    public CobrancaSicoobResponseDTO emitirBoleto(UUID dividaId) {
        garantirHabilitado();
        Divida divida = carregarDivida(dividaId);
        validarSaldoDevedor(divida);

        CobrancaSicoob cobranca = CobrancaSicoob.builder()
                .divida(divida)
                .tipo(TipoCobrancaSicoob.BOLETO)
                .valorCentavos(divida.getValorDevedor())
                .status(StatusCobrancaSicoob.PENDENTE)
                .build();

        try {
            JsonNode resposta = boletoClient.incluirBoleto(divida);
            preencherBoleto(cobranca, resposta);
        } catch (Exception e) {
            cobranca.setStatus(StatusCobrancaSicoob.ERRO);
            cobranca.setMensagemErro(e.getMessage());
            cobrancaRepository.save(cobranca);
            if (e instanceof SicoobApiException s) {
                throw s;
            }
            throw new SicoobApiException("Falha ao emitir boleto: " + e.getMessage(), e);
        }

        cobranca = cobrancaRepository.save(cobranca);
        log.info("Boleto Sicoob {} para dívida {}", cobranca.getCobrancaId(), divida.getProtocolo());
        return toDto(cobranca, divida);
    }

    @Transactional(readOnly = true)
    public List<CobrancaSicoobResponseDTO> listarPorDivida(UUID dividaId) {
        Divida divida = carregarDivida(dividaId);
        return cobrancaRepository.findByDivida_DividaIdOrderByCriadoEmDesc(dividaId).stream()
                .map(c -> toDto(c, divida))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CobrancaSicoobResponseDTO consultar(UUID cobrancaId) {
        CobrancaSicoob c = cobrancaRepository.findById(cobrancaId)
                .orElseThrow(() -> new ResourceNotFoundException("Cobrança Sicoob", cobrancaId));
        return toDto(c, c.getDivida());
    }

    private void registrarWebhookSeConfigurado() {
        if (properties.getWebhookUrlBase() == null || properties.getWebhookUrlBase().isBlank()) {
            return;
        }
        String url = properties.getWebhookUrlBase().replaceAll("/$", "") + "/api/sicoob/webhook/pix";
        try {
            pixClient.registrarWebhook(url);
            log.info("Webhook Pix Sicoob registrado: {}", url);
        } catch (Exception e) {
            log.warn("Não foi possível registrar webhook Pix no Sicoob: {}", e.getMessage());
        }
    }

    private void preencherPix(CobrancaSicoob cobranca, JsonNode resposta) {
        String copia = texto(resposta, "pixCopiaECola");
        if (copia == null) {
            JsonNode pixArray = resposta.path("pix");
            if (pixArray.isArray() && !pixArray.isEmpty()) {
                copia = texto(pixArray.get(0), "pixCopiaECola");
            }
        }
        cobranca.setPixCopiaECola(copia);
        cobranca.setPixQrCode(texto(resposta, "location"));
        if (cobranca.getPixCopiaECola() == null) {
            cobranca.setPixCopiaECola(texto(resposta.path("loc"), "location"));
        }
    }

    private void preencherBoleto(CobrancaSicoob cobranca, JsonNode resposta) {
        JsonNode r = resposta.path("resultado");
        if (r.isMissingNode()) {
            r = resposta;
        }
        cobranca.setBoletoNossoNumero(texto(r, "nossoNumero"));
        cobranca.setBoletoLinhaDigitavel(texto(r, "linhaDigitavel"));
        cobranca.setBoletoCodigoBarras(texto(r, "codigoBarras"));
        String qr = texto(r, "qrCode");
        if (qr != null) {
            cobranca.setPixQrCode(qr);
        }
    }

    private static String texto(JsonNode node, String field) {
        if (node == null || node.isMissingNode()) return null;
        String v = node.path(field).asText(null);
        return (v == null || v.isBlank()) ? null : v;
    }

    private Divida carregarDivida(UUID dividaId) {
        return dividaRepository.findById(dividaId)
                .orElseThrow(() -> new ResourceNotFoundException("Dívida", dividaId));
    }

    private static void validarSaldoDevedor(Divida divida) {
        if (divida.getValorDevedor() == null || divida.getValorDevedor().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleException("Dívida sem saldo devedor para gerar cobrança.");
        }
    }

    private void garantirHabilitado() {
        if (!properties.isEnabled()) {
            throw new BusinessRuleException(
                    "Integração Sicoob desabilitada. Defina sicoob.enabled=true em application.properties ou variáveis de ambiente.");
        }
    }

    private static String gerarTxid(Divida divida) {
        String base = divida.getProtocolo().replaceAll("[^a-zA-Z0-9]", "");
        if (base.length() > 20) {
            base = base.substring(0, 20);
        }
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        return (base + suffix).substring(0, Math.min(35, base.length() + suffix.length()));
    }

    private CobrancaSicoobResponseDTO toDto(CobrancaSicoob c, Divida divida) {
        return CobrancaSicoobResponseDTO.builder()
                .cobrancaId(c.getCobrancaId())
                .dividaId(divida.getDividaId())
                .protocoloDivida(divida.getProtocolo())
                .tipo(c.getTipo())
                .status(c.getStatus())
                .valorCentavos(c.getValorCentavos())
                .pixTxid(c.getPixTxid())
                .pixCopiaECola(c.getPixCopiaECola())
                .pixQrCode(c.getPixQrCode())
                .boletoNossoNumero(c.getBoletoNossoNumero())
                .boletoLinhaDigitavel(c.getBoletoLinhaDigitavel())
                .boletoCodigoBarras(c.getBoletoCodigoBarras())
                .mensagemErro(c.getMensagemErro())
                .criadoEm(c.getCriadoEm())
                .pagoEm(c.getPagoEm())
                .build();
    }
}
