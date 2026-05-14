package com.pucminas.sgi.service;

import com.pucminas.sgi.config.JwtTokenProvider;
import com.pucminas.sgi.dto.request.LoginDTO;
import com.pucminas.sgi.dto.request.RedefinirSenhaRequestDTO;
import com.pucminas.sgi.dto.request.ValidarLoginRequestDTO;
import com.pucminas.sgi.dto.response.LoginResponseDTO;
import com.pucminas.sgi.dto.response.UsuarioResponseDTO;
import com.pucminas.sgi.dto.response.ValidarLoginResponseDTO;
import com.pucminas.sgi.entity.Usuario;
import com.pucminas.sgi.enums.StatusUsuario;
import com.pucminas.sgi.exception.ResourceNotFoundException;
import com.pucminas.sgi.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Serviço de autenticação: login JWT e validação de token.
 */
@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UsuarioRepository usuarioRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UsuarioRepository usuarioRepository,
                       JwtTokenProvider jwtTokenProvider,
                       PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.jwtTokenProvider = jwtTokenProvider;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public LoginResponseDTO autenticar(LoginDTO dto) {
        String identificador = dto.getIdentificador();
        if (identificador == null || identificador.isBlank()) {
            throw new org.springframework.security.authentication.BadCredentialsException("Login é obrigatório");
        }
        Usuario usuario = usuarioRepository.findByTelefone(identificador)
                .orElseThrow(() -> new org.springframework.security.authentication.BadCredentialsException("Login ou senha inválidos"));
        if (usuario.getStatusUsuario() == StatusUsuario.PENDENTE_APROVACAO) {
            throw new org.springframework.security.authentication.BadCredentialsException("Cadastro pendente de aprovação da proprietária.");
        }
        if (usuario.getStatusUsuario() != StatusUsuario.ATIVO) {
            throw new org.springframework.security.authentication.BadCredentialsException("Usuário inativo.");
        }
        if (!passwordEncoder.matches(dto.getSenha(), usuario.getSenha())) {
            throw new org.springframework.security.authentication.BadCredentialsException("Login ou senha inválidos");
        }
        String token = jwtTokenProvider.generateToken(
                usuario.getUsuarioId(),
                usuario.getTelefone(),
                usuario.getPerfil(),
                usuario.getNome()
        );
        registrarAcesso(usuario.getUsuarioId());
        log.info("Login realizado: {}", usuario.getTelefone());
        return LoginResponseDTO.builder()
                .token(token)
                .perfil(usuario.getPerfil())
                .nome(usuario.getNome())
                .login(usuario.getTelefone())
                .build();
    }

    public JwtTokenProvider.JwtClaims validarToken(String token) {
        JwtTokenProvider.JwtClaims claims = jwtTokenProvider.getClaims(token);
        if (claims == null) {
            throw new ResourceNotFoundException("Token inválido ou expirado");
        }
        return claims;
    }

    @Transactional
    public void registrarAcesso(UUID usuarioId) {
        usuarioRepository.findById(usuarioId).ifPresent(u -> {
            u.setUltimoAcesso(LocalDateTime.now());
            usuarioRepository.save(u);
        });
    }

    @Transactional(readOnly = true)
    public UsuarioResponseDTO dadosUsuario(UUID usuarioId) {
        Usuario u = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", usuarioId));
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

    @Transactional(readOnly = true)
    public ValidarLoginResponseDTO validarLoginRecuperacao(ValidarLoginRequestDTO dto) {
        String login = dto.getLogin() == null ? "" : dto.getLogin().trim();
        Usuario usuario = usuarioRepository.findByTelefone(login)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário com login", login));
        return ValidarLoginResponseDTO.builder()
                .encontrado(true)
                .login(usuario.getTelefone())
                .nome(usuario.getNome())
                .mensagem("Login encontrado. Você já pode definir uma nova senha.")
                .build();
    }

    @Transactional
    public void redefinirSenhaSemToken(RedefinirSenhaRequestDTO dto) {
        String login = dto.getLogin() == null ? "" : dto.getLogin().trim();
        if (!dto.getNovaSenha().equals(dto.getConfirmarSenha())) {
            throw new com.pucminas.sgi.exception.BusinessRuleException("Confirmação de senha não confere.");
        }
        Usuario usuario = usuarioRepository.findByTelefone(login)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário com login", login));
        usuario.setSenha(passwordEncoder.encode(dto.getNovaSenha()));
        usuarioRepository.save(usuario);
        log.info("Senha redefinida via recuperação para login: {}", login);
    }
}
