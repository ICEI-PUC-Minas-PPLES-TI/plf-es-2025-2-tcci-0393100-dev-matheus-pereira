package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.AgendamentoNotificacao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Repositório JPA para a entidade AgendamentoNotificacao.
 */
@Repository
public interface AgendamentoNotificacaoRepository extends JpaRepository<AgendamentoNotificacao, UUID> {

    List<AgendamentoNotificacao> findByAtivoAndProximaExecucaoBefore(Boolean ativo, LocalDateTime data);

    List<AgendamentoNotificacao> findByAtivoTrue();
}
