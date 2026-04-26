package com.pucminas.sgi.exception;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

@DisplayName("BusinessRuleException")
class BusinessRuleExceptionTest {

    @Test
    @DisplayName("construtor com mensagem")
    void construtorMensagem() {
        String msg = "Valor pago não pode ser maior que o saldo devedor.";
        BusinessRuleException ex = new BusinessRuleException(msg);
        assertEquals(msg, ex.getMessage());
        assertNull(ex.getCause());
    }
}
