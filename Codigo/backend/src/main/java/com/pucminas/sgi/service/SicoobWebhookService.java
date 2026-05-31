package com.pucminas.sgi.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pucminas.sgi.config.SicoobProperties;
import com.pucminas.sgi.dto.request.PagamentoDTO;
import com.pucminas.sgi.entity.CobrancaSicoob;
import com.pucminas.sgi.enums.StatusCobrancaSicoob;
import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.repository.CobrancaSicoobRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Iterator;

/**
 * Processa notificações Pix do Sicoob (webhook) e baixa a dívida automaticamente.
 */
@Service
public class SicoobWebhookService {

    private static final Logger log = LoggerFactory.getLogger(SicoobWebhookService.class);

    private final SicoobProperties properties;
    private final CobrancaSicoobRepository cobrancaRepository;
    private final PagamentoService pagamentoService;
    private final ObjectMapper objectMapper;

    public SicoobWebhookService(SicoobProperties properties,
                                CobrancaSicoobRepository cobrancaRepository,
                                PagamentoService pagamentoService,
                                ObjectMapper objectMapper) {
        this.properties = properties;
        this.cobrancaRepository = cobrancaRepository;
        this.pagamentoService = pagamentoService;
        this.objectMapper = objectMapper;
    }

    public void validarSegredo(String secretHeader) {
        String esperado = properties.getWebhookSecret();
        if (esperado == null || esperado.isBlank()) {
            return;
        }
        if (secretHeader == null || !esperado.equals(secretHeader)) {
            throw new BusinessRuleException("Webhook Sicoob: segredo inválido.");
        }
    }

    @Transactional
    public void processarPixWebhook(String payload) {
        try {
            JsonNode root = objectMapper.readTree(payload);
            JsonNode pixList = root.path("pix");
            if (!pixList.isArray()) {
                if (root.isArray()) {
                    pixList = root;
                } else {
                    log.warn("Webhook Pix sem array 'pix': {}", payload);
                    return;
                }
            }
            for (Iterator<JsonNode> it = pixList.elements(); it.hasNext(); ) {
                processarItemPix(it.next());
            }
        } catch (BusinessRuleException e) {
            throw e;
        } catch (Exception e) {
            log.error("Erro ao processar webhook Pix", e);
            throw new BusinessRuleException("Payload de webhook Pix inválido.");
        }
    }

    private void processarItemPix(JsonNode pix) {
        String txid = pix.path("txid").asText(null);
        if (txid == null || txid.isBlank()) {
            return;
        }
        CobrancaSicoob cobranca = cobrancaRepository.findByPixTxid(txid).orElse(null);
        if (cobranca == null) {
            log.debug("Webhook Pix para txid desconhecido: {}", txid);
            return;
        }
        if (cobranca.getStatus() == StatusCobrancaSicoob.PAGO) {
            return;
        }

        BigDecimal valorPago = parseValorCentavos(pix.path("valor").asText("0"));
        if (valorPago.compareTo(BigDecimal.ZERO) <= 0) {
            valorPago = cobranca.getValorCentavos();
        }

        PagamentoDTO dto = PagamentoDTO.builder()
                .dividaId(cobranca.getDivida().getDividaId())
                .valorPago(valorPago.min(cobranca.getDivida().getValorDevedor()))
                .dataPagamento(LocalDate.now())
                .metodoPagamento("PIX_SICOOB")
                .comprovante("txid:" + txid + " e2e:" + pix.path("endToEndId").asText(""))
                .build();

        pagamentoService.registrarPagamento(dto);
        cobranca.setStatus(StatusCobrancaSicoob.PAGO);
        cobranca.setPagoEm(LocalDateTime.now());
        cobrancaRepository.save(cobranca);
        log.info("Pagamento Pix confirmado via webhook — txid {}", txid);
    }

    private static BigDecimal parseValorCentavos(String valorReais) {
        try {
            BigDecimal reais = new BigDecimal(valorReais.replace(",", "."));
            return reais.multiply(BigDecimal.valueOf(100)).setScale(0, RoundingMode.HALF_UP);
        } catch (Exception e) {
            return BigDecimal.ZERO;
        }
    }
}
