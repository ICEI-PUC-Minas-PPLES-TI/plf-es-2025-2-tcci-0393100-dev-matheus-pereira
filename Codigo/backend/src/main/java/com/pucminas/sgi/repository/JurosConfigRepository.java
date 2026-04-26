package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.JurosConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface JurosConfigRepository extends JpaRepository<JurosConfig, UUID> {
}

