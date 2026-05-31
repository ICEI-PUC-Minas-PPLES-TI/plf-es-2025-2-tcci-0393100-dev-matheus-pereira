package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.CobrancaSicoob;
import com.pucminas.sgi.enums.StatusCobrancaSicoob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CobrancaSicoobRepository extends JpaRepository<CobrancaSicoob, UUID> {

    List<CobrancaSicoob> findByDivida_DividaIdOrderByCriadoEmDesc(UUID dividaId);

    Optional<CobrancaSicoob> findByPixTxid(String pixTxid);

    Optional<CobrancaSicoob> findFirstByDivida_DividaIdAndStatusOrderByCriadoEmDesc(
            UUID dividaId, StatusCobrancaSicoob status);
}
