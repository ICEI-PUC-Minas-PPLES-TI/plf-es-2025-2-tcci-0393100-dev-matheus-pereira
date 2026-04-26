package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.request.PagamentoDTO;
import com.pucminas.sgi.dto.response.PagamentoResponseDTO;
import com.pucminas.sgi.dto.response.ReciboDTO;
import com.pucminas.sgi.entity.Divida;
import com.pucminas.sgi.entity.Pagamento;
import com.pucminas.sgi.enums.StatusDivida;
import com.pucminas.sgi.exception.BusinessRuleException;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.event.ClienteStatusUpdateEvent;
import com.pucminas.sgi.repository.DividaRepository;
import com.pucminas.sgi.repository.PagamentoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Serviço de pagamentos: registro, recálculo de dívida e saldo do cliente.
 */
@Service
public class PagamentoService {

    private static final Logger log = LoggerFactory.getLogger(PagamentoService.class);

    private final PagamentoRepository pagamentoRepository;
    private final DividaRepository dividaRepository;
    private final DividaService dividaService;
    private final ApplicationEventPublisher eventPublisher;

    public PagamentoService(PagamentoRepository pagamentoRepository,
                            DividaRepository dividaRepository,
                            DividaService dividaService,
                            ApplicationEventPublisher eventPublisher) {
        this.pagamentoRepository = pagamentoRepository;
        this.dividaRepository = dividaRepository;
        this.dividaService = dividaService;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public ReciboDTO registrarPagamento(PagamentoDTO dto) {
        Divida divida = dividaRepository.findById(dto.getDividaId())
                .orElseThrow(() -> new ResourceNotFoundException("Dívida", dto.getDividaId()));
        BigDecimal valorDevedor = divida.getValorDevedor();
        if (dto.getValorPago().compareTo(valorDevedor) > 0) {
            throw new BusinessRuleException("Valor pago não pode ser maior que o saldo devedor da dívida.");
        }
        Pagamento p = Pagamento.builder()
                .divida(divida)
                .valorPago(dto.getValorPago())
                .dataPagamento(dto.getDataPagamento())
                .metodoPagamento(dto.getMetodoPagamento())
                .comprovante(dto.getComprovante())
                .build();
        p = pagamentoRepository.save(p);
        BigDecimal novoDevedor = valorDevedor.subtract(dto.getValorPago());
        divida.setValorDevedor(novoDevedor);
        if (novoDevedor.compareTo(BigDecimal.ZERO) <= 0) {
            divida.setStatusDivida(StatusDivida.QUITADA);
        } else {
            divida.setStatusDivida(StatusDivida.PARCIAL);
        }
        dividaRepository.save(divida);
        eventPublisher.publishEvent(new ClienteStatusUpdateEvent(divida.getCliente().getClienteId()));
        log.info("Pagamento registrado: {} - dívida {}", p.getPagamentoId(), divida.getProtocolo());
        return ReciboDTO.builder()
                .pagamentoId(p.getPagamentoId())
                .dividaId(divida.getDividaId())
                .protocoloDivida(divida.getProtocolo())
                .nomeCliente(divida.getCliente().getNome())
                .valorPago(centavosParaReais(p.getValorPago()))
                .dataPagamento(p.getDataPagamento())
                .metodoPagamento(p.getMetodoPagamento())
                .dataHoraRegistro(p.getCriadoEm())
                .build();
    }

    @Transactional(readOnly = true)
    public List<PagamentoResponseDTO> listarPagamentosPorDivida(UUID dividaId) {
        return pagamentoRepository.findByDivida_DividaIdOrderByDataPagamentoDesc(dividaId).stream()
                .map(p -> PagamentoResponseDTO.builder()
                        .pagamentoId(p.getPagamentoId())
                        .dividaId(p.getDivida().getDividaId())
                        .protocoloDivida(p.getDivida().getProtocolo())
                        .valorPago(centavosParaReais(p.getValorPago()))
                        .dataPagamento(p.getDataPagamento())
                        .metodoPagamento(p.getMetodoPagamento())
                        .comprovante(p.getComprovante())
                        .criadoEm(p.getCriadoEm())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PagamentoResponseDTO consultarPagamento(UUID pagamentoId) {
        Pagamento p = pagamentoRepository.findById(pagamentoId)
                .orElseThrow(() -> new ResourceNotFoundException("Pagamento", pagamentoId));
        return PagamentoResponseDTO.builder()
                .pagamentoId(p.getPagamentoId())
                .dividaId(p.getDivida().getDividaId())
                .protocoloDivida(p.getDivida().getProtocolo())
                .valorPago(centavosParaReais(p.getValorPago()))
                .dataPagamento(p.getDataPagamento())
                .metodoPagamento(p.getMetodoPagamento())
                .comprovante(p.getComprovante())
                .criadoEm(p.getCriadoEm())
                .build();
    }

    private static BigDecimal centavosParaReais(BigDecimal centavos) {
        return centavos == null || centavos.compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : centavos.divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    @Transactional(readOnly = true)
    public BigDecimal calcularTotalPago(UUID dividaId) {
        return pagamentoRepository.sumValorPagoByDividaId(dividaId);
    }
}
