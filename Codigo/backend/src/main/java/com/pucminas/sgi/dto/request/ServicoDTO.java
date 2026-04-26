package com.pucminas.sgi.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServicoDTO {

    @NotBlank(message = "Nome do serviço é obrigatório")
    @Size(max = 200)
    private String nome;

    @Size(max = 500)
    private String descricao;

    private BigDecimal valorPadrao;

    private Boolean ativo;
}
