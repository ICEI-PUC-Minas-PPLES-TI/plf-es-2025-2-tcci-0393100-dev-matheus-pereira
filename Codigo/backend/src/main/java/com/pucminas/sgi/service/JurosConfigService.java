package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.response.JurosConfigDTO;
import com.pucminas.sgi.entity.JurosConfig;
import com.pucminas.sgi.repository.JurosConfigRepository;
import com.pucminas.sgi.util.MultaJurosUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
public class JurosConfigService {

    private static final BigDecimal PADRAO_MULTA_DIARIA = new BigDecimal("0.0033");
    private static final BigDecimal PADRAO_CAP_MULTA = new BigDecimal("0.0999");
    private static final BigDecimal PADRAO_JUROS_MENSAL = new BigDecimal("0.02");

    private final JurosConfigRepository repository;

    public JurosConfigService(JurosConfigRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public JurosConfig getAtual() {
        return repository.findAll().stream().findFirst().orElseGet(this::criarPadrao);
    }

    @Transactional
    public JurosConfig atualizar(JurosConfigDTO dto) {
        JurosConfig atual = getAtual();
        atual.setMultaDiaria(dto.getMultaDiaria() != null ? dto.getMultaDiaria() : PADRAO_MULTA_DIARIA);
        atual.setCapMultaPercentual(dto.getCapMultaPercentual() != null ? dto.getCapMultaPercentual() : PADRAO_CAP_MULTA);
        atual.setJurosMensal(dto.getJurosMensal() != null ? dto.getJurosMensal() : PADRAO_JUROS_MENSAL);
        atual.setAtualizadoEm(LocalDateTime.now());
        JurosConfig salvo = repository.save(atual);
        MultaJurosUtil.configurar(salvo.getMultaDiaria(), salvo.getCapMultaPercentual(), salvo.getJurosMensal());
        return salvo;
    }

    private JurosConfig criarPadrao() {
        JurosConfig cfg = JurosConfig.builder()
                .multaDiaria(PADRAO_MULTA_DIARIA)
                .capMultaPercentual(PADRAO_CAP_MULTA)
                .jurosMensal(PADRAO_JUROS_MENSAL)
                .atualizadoEm(LocalDateTime.now())
                .build();
        JurosConfig salvo = repository.save(cfg);
        MultaJurosUtil.configurar(salvo.getMultaDiaria(), salvo.getCapMultaPercentual(), salvo.getJurosMensal());
        return salvo;
    }
}

