package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.response.UsuarioResponseDTO;
import com.pucminas.sgi.entity.Usuario;
import com.pucminas.sgi.enums.Perfil;
import com.pucminas.sgi.enums.StatusUsuario;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.repository.UsuarioRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("UsuarioService")
@ExtendWith(MockitoExtension.class)
class UsuarioServiceTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UsuarioService usuarioService;

    private static final UUID ID_PROP = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID ID_RESP = UUID.fromString("00000000-0000-0000-0000-000000000002");
    private static final UUID ID_OUTRA_PROP = UUID.fromString("00000000-0000-0000-0000-000000000003");

    @Test
    @DisplayName("listarAtivos: nao-proprietaria recebe 403")
    void listarAtivos_naoProprietaria() {
        Usuario resp = usuarioBase(ID_RESP, Perfil.RESPONSAVEL_FINANCEIRO, StatusUsuario.ATIVO);
        when(usuarioRepository.findById(ID_RESP)).thenReturn(Optional.of(resp));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> usuarioService.listarAtivos(ID_RESP));
        assertEquals(403, ex.getStatusCode().value());
    }

    @Test
    @DisplayName("listarAtivos: proprietaria retorna usuarios ATIVO ordenados por nome")
    void listarAtivos_ok() {
        Usuario prop = usuarioBase(ID_PROP, Perfil.PROPRIETARIA, StatusUsuario.ATIVO);
        when(usuarioRepository.findById(ID_PROP)).thenReturn(Optional.of(prop));

        Usuario a = usuarioBase(ID_RESP, Perfil.RESPONSAVEL_FINANCEIRO, StatusUsuario.ATIVO);
        a.setNome("B");
        Usuario b = usuarioBase(ID_OUTRA_PROP, Perfil.RESPONSAVEL_FINANCEIRO, StatusUsuario.ATIVO);
        b.setNome("A");
        when(usuarioRepository.findByStatusUsuarioOrderByNomeAsc(StatusUsuario.ATIVO)).thenReturn(List.of(b, a));

        List<UsuarioResponseDTO> lista = usuarioService.listarAtivos(ID_PROP);
        assertEquals(2, lista.size());
        assertEquals("A", lista.get(0).getNome());
        assertEquals("B", lista.get(1).getNome());
    }

    @Test
    @DisplayName("revogarAcesso: nao-proprietaria recebe 403")
    void revogar_naoProprietaria() {
        Usuario resp = usuarioBase(ID_RESP, Perfil.RESPONSAVEL_FINANCEIRO, StatusUsuario.ATIVO);
        when(usuarioRepository.findById(ID_RESP)).thenReturn(Optional.of(resp));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> usuarioService.revogarAcesso(ID_PROP, ID_RESP));
        assertEquals(403, ex.getStatusCode().value());
    }

    @Test
    @DisplayName("revogarAcesso: nao pode revogar a si mesma")
    void revogar_siMesma() {
        Usuario prop = usuarioBase(ID_PROP, Perfil.PROPRIETARIA, StatusUsuario.ATIVO);
        when(usuarioRepository.findById(ID_PROP)).thenReturn(Optional.of(prop));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> usuarioService.revogarAcesso(ID_PROP, ID_PROP));
        assertEquals(403, ex.getStatusCode().value());
    }

    @Test
    @DisplayName("revogarAcesso: nao pode revogar outra proprietaria")
    void revogar_outraProprietaria() {
        Usuario prop = usuarioBase(ID_PROP, Perfil.PROPRIETARIA, StatusUsuario.ATIVO);
        Usuario outra = usuarioBase(ID_OUTRA_PROP, Perfil.PROPRIETARIA, StatusUsuario.ATIVO);
        when(usuarioRepository.findById(ID_PROP)).thenReturn(Optional.of(prop));
        when(usuarioRepository.findById(ID_OUTRA_PROP)).thenReturn(Optional.of(outra));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> usuarioService.revogarAcesso(ID_OUTRA_PROP, ID_PROP));
        assertEquals(403, ex.getStatusCode().value());
    }

    @Test
    @DisplayName("revogarAcesso: usuario inexistente lanca 404")
    void revogar_alvoNaoExiste() {
        Usuario prop = usuarioBase(ID_PROP, Perfil.PROPRIETARIA, StatusUsuario.ATIVO);
        when(usuarioRepository.findById(ID_PROP)).thenReturn(Optional.of(prop));
        when(usuarioRepository.findById(ID_RESP)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> usuarioService.revogarAcesso(ID_RESP, ID_PROP));
    }

    @Test
    @DisplayName("revogarAcesso: ja INATIVO e idempotente (nao chama save novamente)")
    void revogar_jaInativo() {
        Usuario prop = usuarioBase(ID_PROP, Perfil.PROPRIETARIA, StatusUsuario.ATIVO);
        Usuario alvo = usuarioBase(ID_RESP, Perfil.RESPONSAVEL_FINANCEIRO, StatusUsuario.INATIVO);
        when(usuarioRepository.findById(ID_PROP)).thenReturn(Optional.of(prop));
        when(usuarioRepository.findById(ID_RESP)).thenReturn(Optional.of(alvo));

        usuarioService.revogarAcesso(ID_RESP, ID_PROP);
        verify(usuarioRepository, never()).save(any());
    }

    @Test
    @DisplayName("revogarAcesso: responsavel ativo fica INATIVO")
    void revogar_sucesso() {
        Usuario prop = usuarioBase(ID_PROP, Perfil.PROPRIETARIA, StatusUsuario.ATIVO);
        Usuario alvo = usuarioBase(ID_RESP, Perfil.RESPONSAVEL_FINANCEIRO, StatusUsuario.ATIVO);
        when(usuarioRepository.findById(ID_PROP)).thenReturn(Optional.of(prop));
        when(usuarioRepository.findById(ID_RESP)).thenReturn(Optional.of(alvo));
        when(usuarioRepository.save(alvo)).thenReturn(alvo);

        UsuarioResponseDTO dto = usuarioService.revogarAcesso(ID_RESP, ID_PROP);
        assertEquals(StatusUsuario.INATIVO, alvo.getStatusUsuario());
        assertEquals(StatusUsuario.INATIVO, dto.getStatusUsuario());
        verify(usuarioRepository).save(alvo);
    }

    private static Usuario usuarioBase(UUID id, Perfil perfil, StatusUsuario status) {
        return Usuario.builder()
                .usuarioId(id)
                .telefone("31999999999")
                .senha("hash")
                .nome("Nome")
                .perfil(perfil)
                .statusUsuario(status)
                .build();
    }
}
