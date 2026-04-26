package com.pucminas.sgi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AliquotasResponseDTO {

    private String categoria;
    private BigDecimal cbs;
    private BigDecimal ibs;
    private BigDecimal total;
}
