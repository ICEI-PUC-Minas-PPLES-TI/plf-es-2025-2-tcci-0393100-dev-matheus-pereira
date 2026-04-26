package com.pucminas.sgi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegimeCnpjResponseDTO {

    private String cnpj;
    private String nomeEmpresa;
    private String regime;
}
