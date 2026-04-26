package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.request.ServicoDTO;
import com.pucminas.sgi.dto.response.ServicoResponseDTO;
import com.pucminas.sgi.entity.Servico;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.repository.ServicoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ServicoService {

    private final ServicoRepository servicoRepository;

    public ServicoService(ServicoRepository servicoRepository) {
        this.servicoRepository = servicoRepository;
    }

    @Transactional(readOnly = true)
    public List<ServicoResponseDTO> listarAtivos() {
        return servicoRepository.findByAtivoTrueOrderByNomeAsc().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ServicoResponseDTO> listarTodos() {
        return servicoRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ServicoResponseDTO buscarPorId(UUID servicoId) {
        Servico s = servicoRepository.findById(servicoId)
                .orElseThrow(() -> new ResourceNotFoundException("Serviço", servicoId));
        return toResponse(s);
    }

    @Transactional
    public ServicoResponseDTO criar(ServicoDTO dto) {
        Servico s = Servico.builder()
                .nome(dto.getNome().trim())
                .descricao(dto.getDescricao() != null ? dto.getDescricao().trim() : null)
                .valorPadrao(dto.getValorPadrao())
                .ativo(dto.getAtivo() != null ? dto.getAtivo() : true)
                .build();
        s = servicoRepository.save(s);
        return toResponse(s);
    }

    @Transactional
    public ServicoResponseDTO atualizar(UUID servicoId, ServicoDTO dto) {
        Servico s = servicoRepository.findById(servicoId)
                .orElseThrow(() -> new ResourceNotFoundException("Serviço", servicoId));
        s.setNome(dto.getNome().trim());
        s.setDescricao(dto.getDescricao() != null ? dto.getDescricao().trim() : null);
        s.setValorPadrao(dto.getValorPadrao());
        if (dto.getAtivo() != null) s.setAtivo(dto.getAtivo());
        servicoRepository.save(s);
        return toResponse(s);
    }

    private ServicoResponseDTO toResponse(Servico s) {
        return ServicoResponseDTO.builder()
                .servicoId(s.getServicoId())
                .nome(s.getNome())
                .descricao(s.getDescricao())
                .valorPadrao(centavosParaReais(s.getValorPadrao()))
                .ativo(s.getAtivo())
                .build();
    }

    private static BigDecimal centavosParaReais(BigDecimal centavos) {
        return centavos == null || centavos.compareTo(BigDecimal.ZERO) == 0
                ? null
                : centavos.divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }
}
