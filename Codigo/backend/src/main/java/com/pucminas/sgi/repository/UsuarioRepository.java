package com.pucminas.sgi.repository;

import com.pucminas.sgi.entity.Usuario;
import com.pucminas.sgi.enums.StatusUsuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;
import java.util.List;

/**
 * Repositório JPA para a entidade Usuario.
 */
@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, UUID> {

    Optional<Usuario> findByTelefone(String telefone);

    Optional<Usuario> findByTelefoneAndStatusUsuario(String telefone, StatusUsuario status);

    List<Usuario> findByStatusUsuarioOrderByCriadoEmAsc(StatusUsuario status);

    List<Usuario> findByStatusUsuarioOrderByNomeAsc(StatusUsuario status);
}
