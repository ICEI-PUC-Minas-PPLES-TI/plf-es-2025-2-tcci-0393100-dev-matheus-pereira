package com.pucminas.sgi.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.pucminas.sgi.enums.StatusCliente;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO de entrada para cadastro e atualização de cliente.
 * Aceita "cpf" (frontend) como alias de cpfCnpj.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClienteDTO {

    @NotBlank(message = "Nome é obrigatório")
    @Size(max = 255)
    private String nome;

    @NotBlank(message = "CPF/CNPJ é obrigatório")
    @Size(max = 18)
    @JsonAlias("cpf")
    private String cpfCnpj;

    @Size(max = 255)
    private String email;

    @Size(max = 20)
    private String telefone;

    @Size(max = 20)
    private String celular;

    @Size(max = 500)
    private String endereco;

    private StatusCliente statusCliente;

    @DecimalMin(value = "0", message = "Saldo não pode ser negativo")
    private BigDecimal saldoDevedor;
}
