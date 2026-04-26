package com.pucminas.sgi.service;

import com.pucminas.sgi.entity.AgendamentoNotificacao;
import com.pucminas.sgi.entity.Cliente;
import com.pucminas.sgi.entity.Divida;
import com.pucminas.sgi.enums.StatusDivida;
import com.pucminas.sgi.repository.AgendamentoNotificacaoRepository;
import com.pucminas.sgi.repository.ClienteRepository;
import com.pucminas.sgi.repository.DividaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Serviço agendado: execução de lembretes e marcação de dívidas vencidas.
 */
@Service
public class SchedulerService {

    private static final Logger log = LoggerFactory.getLogger(SchedulerService.class);

    @Value("${scheduler.enabled:true}")
    private boolean schedulerEnabled;

    private final AgendamentoNotificacaoRepository agendamentoRepository;
    private final DividaRepository dividaRepository;
    private final ClienteRepository clienteRepository;
    private final DividaService dividaService;
    private final NotificationService notificationService;

    public SchedulerService(AgendamentoNotificacaoRepository agendamentoRepository,
                            DividaRepository dividaRepository,
                            ClienteRepository clienteRepository,
                            DividaService dividaService,
                            NotificationService notificationService) {
        this.agendamentoRepository = agendamentoRepository;
        this.dividaRepository = dividaRepository;
        this.clienteRepository = clienteRepository;
        this.dividaService = dividaService;
        this.notificationService = notificationService;
    }

    /**
     * Executa agendamentos cuja próxima execução já passou; envia lembretes para inadimplentes.
     */
    @Scheduled(cron = "${scheduler.agendamentos.cron:0 */30 * * * ?}")
    @Transactional
    public void executarAgendamentos() {
        if (!schedulerEnabled) return;
        List<AgendamentoNotificacao> agendamentos = agendamentoRepository.findByAtivoAndProximaExecucaoBefore(true, LocalDateTime.now());
        for (AgendamentoNotificacao ag : agendamentos) {
            try {
                LocalDate limite = LocalDate.now().minusDays(ag.getCriterioAtraso());
                List<Divida> vencidas = dividaRepository.findByStatusDividaIn(List.of(StatusDivida.VENCIDA, StatusDivida.EM_ABERTO, StatusDivida.PARCIAL)).stream()
                        .filter(d -> d.getVencimento().isBefore(limite) || !d.getVencimento().isAfter(LocalDate.now()))
                        .filter(d -> d.getValorDevedor().compareTo(java.math.BigDecimal.ZERO) > 0)
                        .collect(Collectors.toList());
                Set<UUID> clienteIds = vencidas.stream().map(d -> d.getCliente().getClienteId()).collect(Collectors.toSet());
                for (UUID clienteId : clienteIds) {
                    Cliente c = clienteRepository.findById(clienteId).orElse(null);
                    if (c != null && c.getEmail() != null && !c.getEmail().isBlank()) {
                        try {
                            notificationService.enviarCobrancaEmail(clienteId, null);
                        } catch (Exception e) {
                            log.warn("Falha ao enviar lembrete para cliente {}: {}", clienteId, e.getMessage());
                        }
                    }
                }
                ag.setUltimaExecucao(LocalDateTime.now());
                ag.setProximaExecucao(AgendamentoService.calcularProximaExecucao(LocalDateTime.now(), ag.getPeriodicidade()));
                agendamentoRepository.save(ag);
            } catch (Exception e) {
                log.error("Erro ao executar agendamento {}: {}", ag.getAgendamentoId(), e.getMessage());
            }
        }
    }

    /**
     * Job diário: marca dívidas em aberto como vencidas quando a data de vencimento passou.
     */
    @Scheduled(cron = "${scheduler.dividas-vencidas.cron:0 0 1 * * ?}")
    @Transactional
    public void marcarDividasVencidas() {
        if (!schedulerEnabled) return;
        dividaService.verificarDividasVencidas();
    }

    /**
     * Job diário: recalcula e atualiza valorDevedor das dívidas em atraso com multa e juros.
     */
    @Scheduled(cron = "${scheduler.multa-juros.cron:0 0 2 * * ?}")
    @Transactional
    public void atualizarMultaJuros() {
        if (!schedulerEnabled) return;
        dividaService.atualizarValorComMultaJuros();
    }
}
