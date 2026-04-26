package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.Pagamento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repositório JPA para a entidade Pagamento.
 */
@Repository
public interface PagamentoRepository extends JpaRepository<Pagamento, UUID> {

    List<Pagamento> findByDivida_DividaIdOrderByDataPagamentoDesc(UUID dividaId);

    List<Pagamento> findByDataPagamentoBetween(LocalDate inicio, LocalDate fim);

    @Query("SELECT COALESCE(SUM(p.valorPago), 0) FROM Pagamento p WHERE p.divida.dividaId = :dividaId")
    java.math.BigDecimal sumValorPagoByDividaId(@Param("dividaId") UUID dividaId);
}
