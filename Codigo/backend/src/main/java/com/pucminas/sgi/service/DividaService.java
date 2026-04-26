package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.request.DividaDTO;
import com.pucminas.sgi.dto.request.ItemServicoDTO;
import com.pucminas.sgi.dto.response.DividaResponseDTO;
import com.pucminas.sgi.dto.response.ItemServicoResponseDTO;
import com.pucminas.sgi.dto.response.PagamentoResponseDTO;
import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.Divida;
import com.pucminas.sgi.entity.DividaServico;
import com.pucminas.sgi.entity.Pagamento;
import com.pucminas.sgi.entity.Servico;
import com.pucminas.sgi.enums.StatusDivida;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.repository.ClienteRepository;
import com.pucminas.sgi.repository.DividaRepository;
import com.pucminas.sgi.repository.PagamentoRepository;
import com.pucminas.sgi.repository.ServicoRepository;
import com.pucminas.sgi.util.MultaJurosUtil;
import com.pucminas.sgi.util.VencimentoUtil;
import com.pucminas.sgi.event.ClienteStatusUpdateEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Serviço de dívidas: registro, consulta, listagem e atualização de status.
 */
@Service
public class DividaService {

    private static final Logger log = LoggerFactory.getLogger(DividaService.class);

    private final DividaRepository dividaRepository;
    private final ClienteRepository clienteRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final PagamentoRepository pagamentoRepository;
    private final ServicoRepository servicoRepository;

    public DividaService(DividaRepository dividaRepository,
                         ClienteRepository clienteRepository,
                         ApplicationEventPublisher eventPublisher,
                         PagamentoRepository pagamentoRepository,
                         ServicoRepository servicoRepository) {
        this.dividaRepository = dividaRepository;
        this.clienteRepository = clienteRepository;
        this.eventPublisher = eventPublisher;
        this.pagamentoRepository = pagamentoRepository;
        this.servicoRepository = servicoRepository;
    }

    @Transactional
    public DividaResponseDTO registrarDivida(DividaDTO dto) {
        Cliente cliente = clienteRepository.findById(dto.getClienteId())
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", dto.getClienteId()));
        LocalDate vencimento = dto.getVencimento() != null ? dto.getVencimento() : VencimentoUtil.getVencimentoPadrao();
        String protocolo = gerarProtocolo();
        Divida d = Divida.builder()
                .cliente(cliente)
                .valorOriginal(dto.getValorOriginal())
                .valorDevedor(dto.getValorOriginal())
                .vencimento(vencimento)
                .descricao(dto.getDescricao())
                .statusDivida(LocalDate.now().isAfter(vencimento) ? StatusDivida.VENCIDA : StatusDivida.EM_ABERTO)
                .protocolo(protocolo)
                .criadoEm(LocalDateTime.now())
                .atualizadoEm(LocalDateTime.now())
                .build();
        if (dto.getItensServicos() != null && !dto.getItensServicos().isEmpty()) {
            for (ItemServicoDTO item : dto.getItensServicos()) {
                Servico servico = servicoRepository.findById(item.getServicoId())
                        .orElseThrow(() -> new ResourceNotFoundException("Serviço", item.getServicoId()));
                DividaServico ds = DividaServico.builder()
                        .divida(d)
                        .servico(servico)
                        .valor(item.getValor() != null ? item.getValor() : BigDecimal.ZERO)
                        .build();
                d.getItensServicos().add(ds);
            }
        }
        d = dividaRepository.save(d);
        eventPublisher.publishEvent(new ClienteStatusUpdateEvent(cliente.getClienteId()));
        log.info("Dívida registrada: {} - {}", d.getDividaId(), protocolo);
        return toResponse(d);
    }

    private String gerarProtocolo() {
        String data = LocalDate.now().format(java.time.format.DateTimeFormatter.BASIC_ISO_DATE);
        String uuidCurto = UUID.randomUUID().toString().substring(0, 8).toUpperCase().replace("-", "");
        return "DIV-" + data + "-" + uuidCurto;
    }

    @Transactional(readOnly = true)
    public DividaResponseDTO consultarDivida(UUID dividaId) {
        Divida d = dividaRepository.findById(dividaId)
                .orElseThrow(() -> new ResourceNotFoundException("Dívida", dividaId));
        return toResponse(d);
    }

    @Transactional(readOnly = true)
    public List<DividaResponseDTO> listarDividasPorCliente(UUID clienteId) {
        return dividaRepository.findByCliente_ClienteIdOrderByVencimentoAsc(clienteId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<DividaResponseDTO> listarDividas(UUID clienteId, List<StatusDivida> status, LocalDate inicio, LocalDate fim, Pageable pageable) {
        if (clienteId != null) {
            List<Divida> list = dividaRepository.findByCliente_ClienteIdOrderByVencimentoAsc(clienteId);
            if (status != null && !status.isEmpty()) {
                list = list.stream().filter(d -> status.contains(d.getStatusDivida())).collect(Collectors.toList());
            }
            if (inicio != null) {
                list = list.stream().filter(d -> !d.getVencimento().isBefore(inicio)).collect(Collectors.toList());
            }
            if (fim != null) {
                list = list.stream().filter(d -> !d.getVencimento().isAfter(fim)).collect(Collectors.toList());
            }
            int start = (int) pageable.getOffset();
            int end = Math.min(start + pageable.getPageSize(), list.size());
            return new org.springframework.data.domain.PageImpl<>(
                    list.subList(start, end).stream().map(this::toResponse).collect(Collectors.toList()),
                    pageable,
                    list.size()
            );
        }
        if (inicio != null && fim != null) {
            return dividaRepository.findByVencimentoBetween(inicio, fim, pageable).map(this::toResponse);
        }
        if (status != null && !status.isEmpty()) {
            return dividaRepository.findByStatusDividaIn(status, pageable).map(this::toResponse);
        }
        return dividaRepository.findAll(pageable).map(this::toResponse);
    }

    @Transactional
    public void atualizarStatusDivida(UUID dividaId) {
        Divida d = dividaRepository.findById(dividaId)
                .orElseThrow(() -> new ResourceNotFoundException("Dívida", dividaId));
        BigDecimal totalPago = pagamentoRepository.sumValorPagoByDividaId(dividaId);
        if (totalPago == null) totalPago = BigDecimal.ZERO;
        BigDecimal principal = d.getValorOriginal().subtract(totalPago);
        LocalDate hoje = LocalDate.now();
        BigDecimal valorDevedor = principal.compareTo(BigDecimal.ZERO) <= 0 ? BigDecimal.ZERO
                : (hoje.isAfter(d.getVencimento())
                ? MultaJurosUtil.valorTotalComMultaEJuros(principal, d.getVencimento(), hoje)
                : principal);
        d.setValorDevedor(valorDevedor);
        if (valorDevedor.compareTo(BigDecimal.ZERO) <= 0) {
            d.setStatusDivida(StatusDivida.QUITADA);
        } else if (totalPago.compareTo(BigDecimal.ZERO) > 0) {
            d.setStatusDivida(StatusDivida.PARCIAL);
        } else if (hoje.isAfter(d.getVencimento())) {
            d.setStatusDivida(StatusDivida.VENCIDA);
        } else {
            d.setStatusDivida(StatusDivida.EM_ABERTO);
        }
        dividaRepository.save(d);
        eventPublisher.publishEvent(new ClienteStatusUpdateEvent(d.getCliente().getClienteId()));
    }

    /**
     * Atualiza valorDevedor das dívidas em atraso com multa (0,33% ao dia, máx. 9,99%) e juros (2% ao mês).
     * Principal = valorOriginal - totalPago; valorDevedor = principal + multa + juros.
     */
    @Transactional
    public void atualizarValorComMultaJuros() {
        LocalDate hoje = LocalDate.now();
        List<Divida> emAberto = dividaRepository.findByStatusDividaIn(
                List.of(StatusDivida.EM_ABERTO, StatusDivida.PARCIAL, StatusDivida.VENCIDA));
        for (Divida d : emAberto) {
            if (!hoje.isAfter(d.getVencimento())) continue;
            BigDecimal totalPago = pagamentoRepository.sumValorPagoByDividaId(d.getDividaId());
            if (totalPago == null) totalPago = BigDecimal.ZERO;
            BigDecimal principal = d.getValorOriginal().subtract(totalPago);
            if (principal.compareTo(BigDecimal.ZERO) <= 0) {
                d.setValorDevedor(BigDecimal.ZERO);
                d.setStatusDivida(StatusDivida.QUITADA);
                dividaRepository.save(d);
                continue;
            }
            BigDecimal valorAtualizado = MultaJurosUtil.valorTotalComMultaEJuros(principal, d.getVencimento(), hoje);
            d.setValorDevedor(valorAtualizado);
            dividaRepository.save(d);
        }
        log.info("Atualização de multa e juros concluída");
    }

    /**
     * Job: marca dívidas vencidas cujo vencimento já passou.
     */
    @Transactional
    public void verificarDividasVencidas() {
        List<Divida> emAberto = dividaRepository.findByStatusDividaIn(List.of(StatusDivida.EM_ABERTO));
        LocalDate hoje = LocalDate.now();
        for (Divida d : emAberto) {
            if (hoje.isAfter(d.getVencimento())) {
                d.setStatusDivida(StatusDivida.VENCIDA);
                dividaRepository.save(d);
            }
        }
        log.info("Verificação de dívidas vencidas concluída");
    }

    private DividaResponseDTO toResponse(Divida d) {
        Cliente c = d.getCliente();
        List<ItemServicoResponseDTO> itensDto = d.getItensServicos().stream()
                .map(item -> ItemServicoResponseDTO.builder()
                        .servicoId(item.getServico().getServicoId())
                        .nomeServico(item.getServico().getNome())
                        .valor(centavosParaReais(item.getValor()))
                        .build())
                .collect(Collectors.toList());
        BigDecimal[] valorEJuros = computarValorEJurosEmTempoReal(d);
        BigDecimal vOrig = centavosParaReais(d.getValorOriginal());
        BigDecimal vDev = valorEJuros[0];
        BigDecimal juros = valorEJuros[1];
        List<PagamentoResponseDTO> pagamentosDto = pagamentoRepository.findByDivida_DividaIdOrderByDataPagamentoDesc(d.getDividaId())
                .stream()
                .map(this::pagamentoParaDto)
                .collect(Collectors.toList());
        return DividaResponseDTO.builder()
                .dividaId(d.getDividaId())
                .clienteId(c.getClienteId())
                .nomeCliente(c.getNome())
                .valorOriginal(vOrig)
                .valorDevedor(vDev)
                .juros(juros)
                .vencimento(d.getVencimento())
                .descricao(d.getDescricao())
                .statusDivida(d.getStatusDivida())
                .protocolo(d.getProtocolo())
                .criadoEm(d.getCriadoEm())
                .atualizadoEm(d.getAtualizadoEm())
                .itensServicos(itensDto)
                .pagamentos(pagamentosDto)
                .build();
    }

    private PagamentoResponseDTO pagamentoParaDto(Pagamento p) {
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

    /**
     * Calcula valor devedor e juros em tempo real. Para dívidas vencidas (EM_ABERTO, VENCIDA, PARCIAL)
     * usa MultaJurosUtil; caso contrário usa o valor armazenado.
     * Retorna [valorDevedorReais, jurosReais].
     */
    private BigDecimal[] computarValorEJurosEmTempoReal(Divida d) {
        LocalDate hoje = LocalDate.now();
        boolean vencida = hoje.isAfter(d.getVencimento());
        boolean statusAberto = List.of(StatusDivida.EM_ABERTO, StatusDivida.VENCIDA, StatusDivida.PARCIAL)
                .contains(d.getStatusDivida());
        if (!vencida || !statusAberto) {
            BigDecimal vOrig = centavosParaReais(d.getValorOriginal());
            BigDecimal vDev = centavosParaReais(d.getValorDevedor());
            BigDecimal juros = vDev.subtract(vOrig).max(BigDecimal.ZERO);
            return new BigDecimal[]{vDev, juros};
        }
        BigDecimal totalPago = pagamentoRepository.sumValorPagoByDividaId(d.getDividaId());
        if (totalPago == null) totalPago = BigDecimal.ZERO;
        BigDecimal principal = d.getValorOriginal().subtract(totalPago);
        if (principal.compareTo(BigDecimal.ZERO) <= 0) {
            return new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO};
        }
        BigDecimal valorAtualizadoCentavos = MultaJurosUtil.valorTotalComMultaEJuros(principal, d.getVencimento(), hoje);
        BigDecimal jurosCentavos = valorAtualizadoCentavos.subtract(principal);
        return new BigDecimal[]{
                centavosParaReais(valorAtualizadoCentavos),
                centavosParaReais(jurosCentavos)
        };
    }

    private static BigDecimal centavosParaReais(BigDecimal centavos) {
        return centavos == null || centavos.compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : centavos.divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    /** Exposto para ClienteService e InadimplenciaService. */
    public DividaResponseDTO toResponseDTO(Divida d) {
        return toResponse(d);
    }

    /** Retorna [valorDevedorReais, jurosReais] calculados em tempo real. Para InadimplenciaService. */
    public BigDecimal[] getValorEJurosReais(Divida d) {
        return computarValorEJurosEmTempoReal(d);
    }
}
