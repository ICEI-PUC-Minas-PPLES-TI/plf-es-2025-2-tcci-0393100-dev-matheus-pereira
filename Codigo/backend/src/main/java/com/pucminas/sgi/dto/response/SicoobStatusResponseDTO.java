package com.pucminas.sgi.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SicoobStatusResponseDTO {

    private boolean enabled;
    private boolean mock;
    private boolean configuredForApi;
    private String mensagem;
}
