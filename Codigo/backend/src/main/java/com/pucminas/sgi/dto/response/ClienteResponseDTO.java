package com.pucminas.sgi.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.pucminas.sgi.enums.StatusCliente;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO de resposta com dados do cliente.
 * Expõe aliases {@code telefoneFixo} e {@code situacao} para compatibilidade com o frontend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClienteResponseDTO {

    private UUID clienteId;
    private String nome;
    private String cpfCnpj;
    private String email;
    private String telefone;
    private String celular;
    private String endereco;
    private StatusCliente statusCliente;
    private BigDecimal saldoDevedor;
    private LocalDateTime criadoEm;
    private LocalDateTime atualizadoEm;

    @JsonProperty("telefoneFixo")
    public String getTelefoneFixo() {
        return telefone;
    }

    @JsonProperty("situacao")
    public StatusCliente getSituacao() {
        return statusCliente;
    }
}
