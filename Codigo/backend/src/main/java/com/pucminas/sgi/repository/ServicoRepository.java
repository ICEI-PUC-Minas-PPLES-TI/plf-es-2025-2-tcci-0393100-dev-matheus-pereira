package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.Servico;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ServicoRepository extends JpaRepository<Servico, UUID> {

    List<Servico> findByAtivoTrueOrderByNomeAsc();

    Optional<Servico> findByNome(String nome);
}
