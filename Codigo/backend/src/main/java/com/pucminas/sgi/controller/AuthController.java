package com.pucminas.sgi.controller;

import com.pucminas.sgi.config.JwtTokenProvider;
import com.pucminas.sgi.dto.request.CadastroUsuarioDTO;
import com.pucminas.sgi.dto.request.LoginDTO;
import com.pucminas.sgi.dto.request.RedefinirSenhaRequestDTO;
import com.pucminas.sgi.dto.request.ValidarLoginRequestDTO;
import com.pucminas.sgi.dto.response.LoginResponseDTO;
import com.pucminas.sgi.dto.response.MensagemResponseDTO;
import com.pucminas.sgi.dto.response.UsuarioResponseDTO;
import com.pucminas.sgi.dto.response.ValidarLoginResponseDTO;
import com.pucminas.sgi.service.AuthService;
import com.pucminas.sgi.service.UsuarioService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Autenticação", description = "Login e dados do usuário autenticado")
public class AuthController {

    private final AuthService authService;
    private final JwtTokenProvider jwtTokenProvider;
    private final UsuarioService usuarioService;

    public AuthController(AuthService authService,
                          JwtTokenProvider jwtTokenProvider,
                          UsuarioService usuarioService) {
        this.authService = authService;
        this.jwtTokenProvider = jwtTokenProvider;
        this.usuarioService = usuarioService;
    }

    @PostMapping("/login")
    @Operation(summary = "Login", description = "Autentica por login (telefone ou usuário) e senha, retorna token JWT")
    public ResponseEntity<LoginResponseDTO> login(@Valid @RequestBody LoginDTO dto) {
        LoginResponseDTO response = authService.autenticar(dto);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/register")
    @Operation(summary = "Cadastro público", description = "Cria um usuário básico para primeiro acesso (nome, login e senha)")
    public ResponseEntity<Void> register(@Valid @RequestBody CadastroUsuarioDTO dto) {
        CadastroUsuarioDTO payload = CadastroUsuarioDTO.builder()
                .nome(dto.getNome())
                .login(dto.getLogin())
                .telefone1(dto.getLogin())
                .senha(dto.getSenha())
                .build();
        usuarioService.cadastrarPublico(payload);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PostMapping("/validar-login-recuperacao")
    @Operation(summary = "Validar login para recuperação de senha", description = "Primeiro passo do fluxo de esqueci a senha")
    public ResponseEntity<ValidarLoginResponseDTO> validarLoginRecuperacao(@Valid @RequestBody ValidarLoginRequestDTO dto) {
        return ResponseEntity.ok(authService.validarLoginRecuperacao(dto));
    }

    @PostMapping("/redefinir-senha")
    @Operation(summary = "Redefinir senha sem token", description = "Segundo passo: após validar login, permite definir nova senha")
    public ResponseEntity<MensagemResponseDTO> redefinirSenha(@Valid @RequestBody RedefinirSenhaRequestDTO dto) {
        authService.redefinirSenhaSemToken(dto);
        return ResponseEntity.ok(MensagemResponseDTO.builder()
                .mensagem("Senha alterada com sucesso.")
                .build());
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout", description = "Invalida token (cliente deve descartar o token)")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.ok().build();
    }

    @GetMapping("/me")
    @Operation(summary = "Dados do usuário", description = "Retorna dados do usuário autenticado")
    public ResponseEntity<UsuarioResponseDTO> me(Authentication authentication) {
        UUID usuarioId = (UUID) authentication.getPrincipal();
        UsuarioResponseDTO dto = authService.dadosUsuario(usuarioId);
        return ResponseEntity.ok(dto);
    }
}
