package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.Divida;
import com.pucminas.sgi.enums.StatusDivida;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repositório JPA para a entidade Divida.
 */
@Repository
public interface DividaRepository extends JpaRepository<Divida, UUID> {

    List<Divida> findByCliente_ClienteIdAndStatusDivida(UUID clienteId, StatusDivida status);

    List<Divida> findByVencimentoBetween(LocalDate inicio, LocalDate fim);

    Page<Divida> findByVencimentoBetween(LocalDate inicio, LocalDate fim, Pageable pageable);

    List<Divida> findByStatusDividaIn(List<StatusDivida> status);

    Page<Divida> findByStatusDividaIn(List<StatusDivida> status, Pageable pageable);

    List<Divida> findByCliente_ClienteIdOrderByVencimentoAsc(UUID clienteId);

    Page<Divida> findByCliente_ClienteId(UUID clienteId, Pageable pageable);

    Optional<Divida> findByProtocolo(String protocolo);

    @Query("SELECT d FROM Divida d JOIN FETCH d.cliente WHERE d.dividaId = :id")
    Optional<Divida> findByIdWithCliente(@Param("id") UUID id);

    /** Atualiza apenas o status (ex.: CANCELADA). JPQL. */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE Divida d SET d.statusDivida = :status WHERE d.dividaId = :id")
    int setStatusDivida(@Param("id") UUID id, @Param("status") StatusDivida status);

    /** UPDATE nativo para SQLite (evita problemas de dialeto com JPQL). */
    @Modifying(clearAutomatically = true)
    @Query(value = "UPDATE divida SET status_divida = 'CANCELADA' WHERE divida_id = :id", nativeQuery = true)
    int setStatusCanceladaNative(@Param("id") UUID id);

    @Query("SELECT d.cliente.clienteId FROM Divida d WHERE d.dividaId = :id")
    Optional<UUID> findClienteIdByDividaId(@Param("id") UUID id);

    @Query("SELECT COALESCE(SUM(d.valorDevedor), 0) FROM Divida d WHERE d.cliente.clienteId = :clienteId AND d.statusDivida IN :statusList")
    java.math.BigDecimal sumValorDevedorByClienteId(@Param("clienteId") UUID clienteId, @Param("statusList") List<StatusDivida> statusList);
}
