package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.EmailConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Repositório JPA para a entidade EmailConfig.
 */
@Repository
public interface EmailConfigRepository extends JpaRepository<EmailConfig, UUID> {

    Optional<EmailConfig> findFirstByAtivoTrue();
}
