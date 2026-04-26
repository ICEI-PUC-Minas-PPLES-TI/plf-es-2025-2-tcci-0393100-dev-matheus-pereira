package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.request.AgendamentoDTO;
import com.pucminas.sgi.dto.response.AgendamentoResponseDTO;
import com.pucminas.sgi.entity.AgendamentoNotificacao;
import com.pucminas.sgi.enums.Periodicidade;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.repository.AgendamentoNotificacaoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AgendamentoService {

    private static final Logger log = LoggerFactory.getLogger(AgendamentoService.class);

    private final AgendamentoNotificacaoRepository agendamentoRepository;

    public AgendamentoService(AgendamentoNotificacaoRepository agendamentoRepository) {
        this.agendamentoRepository = agendamentoRepository;
    }

    @Transactional
    public AgendamentoResponseDTO criarAgendamento(AgendamentoDTO dto) {
        AgendamentoNotificacao a = AgendamentoNotificacao.builder()
                .nome(dto.getNome())
                .descricao(dto.getDescricao())
                .periodicidade(dto.getPeriodicidade())
                .criterioAtraso(dto.getCriterioAtraso())
                .ativo(dto.getAtivo())
                .proximaExecucao(LocalDateTime.now())
                .build();
        a = agendamentoRepository.save(a);
        log.info("Agendamento criado: {} - {}", a.getAgendamentoId(), a.getNome());
        return toResponse(a);
    }

    @Transactional
    public AgendamentoResponseDTO atualizarAgendamento(UUID agendamentoId, AgendamentoDTO dto) {
        AgendamentoNotificacao a = agendamentoRepository.findById(agendamentoId)
                .orElseThrow(() -> new ResourceNotFoundException("Agendamento", agendamentoId));
        a.setNome(dto.getNome());
        a.setDescricao(dto.getDescricao());
        a.setPeriodicidade(dto.getPeriodicidade());
        a.setCriterioAtraso(dto.getCriterioAtraso());
        a.setAtivo(dto.getAtivo());
        a = agendamentoRepository.save(a);
        return toResponse(a);
    }

    @Transactional
    public void ativarDesativarAgendamento(UUID agendamentoId, boolean ativo) {
        AgendamentoNotificacao a = agendamentoRepository.findById(agendamentoId)
                .orElseThrow(() -> new ResourceNotFoundException("Agendamento", agendamentoId));
        a.setAtivo(ativo);
        agendamentoRepository.save(a);
    }

    @Transactional(readOnly = true)
    public List<AgendamentoResponseDTO> listarAgendamentosAtivos() {
        return agendamentoRepository.findByAtivoTrue().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AgendamentoResponseDTO> listarAgendamentos() {
        return agendamentoRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AgendamentoResponseDTO consultarAgendamento(UUID agendamentoId) {
        AgendamentoNotificacao a = agendamentoRepository.findById(agendamentoId)
                .orElseThrow(() -> new ResourceNotFoundException("Agendamento", agendamentoId));
        return toResponse(a);
    }

    public static LocalDateTime calcularProximaExecucao(LocalDateTime from, Periodicidade p) {
        return switch (p) {
            case DIARIO -> from.plusDays(1);
            case SEMANAL -> from.plusWeeks(1);
            case QUINZENAL -> from.plusWeeks(2);
            case MENSAL -> from.plusMonths(1);
        };
    }

    private AgendamentoResponseDTO toResponse(AgendamentoNotificacao a) {
        return AgendamentoResponseDTO.builder()
                .agendamentoId(a.getAgendamentoId())
                .nome(a.getNome())
                .descricao(a.getDescricao())
                .periodicidade(a.getPeriodicidade())
                .criterioAtraso(a.getCriterioAtraso())
                .ativo(a.getAtivo())
                .ultimaExecucao(a.getUltimaExecucao())
                .proximaExecucao(a.getProximaExecucao())
                .criadoEm(a.getCriadoEm())
                .build();
    }
}
