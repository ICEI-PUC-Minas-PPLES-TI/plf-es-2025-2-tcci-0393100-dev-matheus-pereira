package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.NotificacaoEmail;
import com.pucminas.sgi.enums.StatusEnvio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Repositório JPA para a entidade NotificacaoEmail.
 */
@Repository
public interface NotificacaoEmailRepository extends JpaRepository<NotificacaoEmail, UUID> {

    List<NotificacaoEmail> findByStatusEnvio(StatusEnvio status);

    List<NotificacaoEmail> findByClienteIdOrderByDataEnvioDesc(UUID clienteId);

    List<NotificacaoEmail> findByStatusEnvioAndProximaTentativaBefore(StatusEnvio status, LocalDateTime data);

    List<NotificacaoEmail> findByCriadoEmBetween(LocalDateTime inicio, LocalDateTime fim);
}
