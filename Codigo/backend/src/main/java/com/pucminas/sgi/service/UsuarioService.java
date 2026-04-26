package com.pucminas.sgi.service;

import com.pucminas.sgi.dto.request.CadastroUsuarioDTO;
import com.pucminas.sgi.dto.response.UsuarioResponseDTO;
import com.pucminas.sgi.entity.Usuario;
import com.pucminas.sgi.enums.Perfil;
import com.pucminas.sgi.enums.StatusUsuario;
import com.pucminas.sgi.exception.DuplicateResourceException;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

import static org.springframework.http.HttpStatus.FORBIDDEN;

@Service
public class UsuarioService {

    private static final Logger log = LoggerFactory.getLogger(UsuarioService.class);

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public UsuarioService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public void cadastrar(CadastroUsuarioDTO dto) {
        String telefone = dto.getLogin() != null && !dto.getLogin().isBlank()
                ? dto.getLogin()
                : dto.getTelefone1();
        if (telefone == null || telefone.isBlank()) {
            throw new IllegalArgumentException("Login ou telefone1 é obrigatório.");
        }
        if (usuarioRepository.findByTelefone(telefone).isPresent()) {
            throw new DuplicateResourceException("Já existe usuário com este telefone/login.");
        }
        Perfil perfil = "PROPRIETARIA".equalsIgnoreCase(dto.getPermissao()) ? Perfil.PROPRIETARIA : Perfil.RESPONSAVEL_FINANCEIRO;
        String senhaHash = dto.getSenha() != null && !dto.getSenha().isBlank()
                ? passwordEncoder.encode(dto.getSenha())
                : passwordEncoder.encode("senha123");
        Usuario u = Usuario.builder()
                .telefone(telefone)
                .senha(senhaHash)
                .nome(dto.getNome())
                .perfil(perfil)
                .statusUsuario(Boolean.FALSE.equals(dto.getAtivo()) ? StatusUsuario.INATIVO : StatusUsuario.ATIVO)
                .build();
        usuarioRepository.save(u);
        log.info("Usuário cadastrado: {}", u.getTelefone());
    }

    @Transactional
    public void cadastrarPublico(CadastroUsuarioDTO dto) {
        String login = dto.getLogin() != null && !dto.getLogin().isBlank()
                ? dto.getLogin()
                : dto.getTelefone1();
        if (login == null || login.isBlank()) {
            throw new IllegalArgumentException("Login é obrigatório.");
        }
        if (usuarioRepository.findByTelefone(login).isPresent()) {
            throw new DuplicateResourceException("Já existe usuário com este login.");
        }
        if (dto.getSenha() == null || dto.getSenha().isBlank()) {
            throw new IllegalArgumentException("Senha é obrigatória.");
        }
        Usuario u = Usuario.builder()
                .telefone(login)
                .senha(passwordEncoder.encode(dto.getSenha()))
                .nome(dto.getNome())
                .perfil(Perfil.RESPONSAVEL_FINANCEIRO)
                .statusUsuario(StatusUsuario.PENDENTE_APROVACAO)
                .build();
        usuarioRepository.save(u);
        log.info("Cadastro público pendente criado: {}", u.getTelefone());
    }

    @Transactional(readOnly = true)
    public List<UsuarioResponseDTO> listarPendentes() {
        return usuarioRepository.findByStatusUsuarioOrderByCriadoEmAsc(StatusUsuario.PENDENTE_APROVACAO)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public UsuarioResponseDTO aprovarCadastro(UUID usuarioId, UUID aprovadorId) {
        Usuario aprovador = usuarioRepository.findById(aprovadorId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário aprovador", aprovadorId));
        if (aprovador.getPerfil() != Perfil.PROPRIETARIA) {
            throw new ResponseStatusException(FORBIDDEN, "Apenas a proprietária pode aprovar cadastros.");
        }
        Usuario u = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", usuarioId));
        u.setStatusUsuario(StatusUsuario.ATIVO);
        usuarioRepository.save(u);
        log.info("Cadastro aprovado: {} por {}", u.getTelefone(), aprovador.getTelefone());
        return toResponse(u);
    }

    @Transactional(readOnly = true)
    public List<UsuarioResponseDTO> listarAtivos(UUID solicitanteId) {
        assertProprietaria(solicitanteId);
        return usuarioRepository.findByStatusUsuarioOrderByNomeAsc(StatusUsuario.ATIVO)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public UsuarioResponseDTO revogarAcesso(UUID alvoId, UUID revogadorId) {
        Usuario revogador = usuarioRepository.findById(revogadorId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", revogadorId));
        if (revogador.getPerfil() != Perfil.PROPRIETARIA) {
            throw new ResponseStatusException(FORBIDDEN, "Apenas a proprietária pode revogar acesso.");
        }
        if (alvoId.equals(revogadorId)) {
            throw new ResponseStatusException(FORBIDDEN, "Não é possível revogar o próprio acesso.");
        }
        Usuario alvo = usuarioRepository.findById(alvoId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", alvoId));
        if (alvo.getPerfil() == Perfil.PROPRIETARIA) {
            throw new ResponseStatusException(FORBIDDEN, "Não é possível revogar o acesso de outra proprietária.");
        }
        if (alvo.getStatusUsuario() == StatusUsuario.INATIVO) {
            return toResponse(alvo);
        }
        alvo.setStatusUsuario(StatusUsuario.INATIVO);
        usuarioRepository.save(alvo);
        log.info("Acesso revogado: {} por {}", alvo.getTelefone(), revogador.getTelefone());
        return toResponse(alvo);
    }

    private void assertProprietaria(UUID usuarioId) {
        Usuario u = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", usuarioId));
        if (u.getPerfil() != Perfil.PROPRIETARIA) {
            throw new ResponseStatusException(FORBIDDEN, "Apenas a proprietária pode listar usuários ativos.");
        }
    }

    private UsuarioResponseDTO toResponse(Usuario u) {
        return UsuarioResponseDTO.builder()
                .usuarioId(u.getUsuarioId())
                .login(u.getTelefone())
                .nome(u.getNome())
                .perfil(u.getPerfil())
                .statusUsuario(u.getStatusUsuario())
                .ultimoAcesso(u.getUltimoAcesso())
                .criadoEm(u.getCriadoEm())
                .build();
    }
}
