package com.pucminas.sgi.exception;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

@DisplayName("DuplicateResourceException")
class DuplicateResourceExceptionTest {

    @Test
    @DisplayName("construtor com mensagem")
    void construtorMensagem() {
        String msg = "CPF/CNPJ já cadastrado";
        DuplicateResourceException ex = new DuplicateResourceException(msg);
        assertEquals(msg, ex.getMessage());
        assertNull(ex.getCause());
    }
}
