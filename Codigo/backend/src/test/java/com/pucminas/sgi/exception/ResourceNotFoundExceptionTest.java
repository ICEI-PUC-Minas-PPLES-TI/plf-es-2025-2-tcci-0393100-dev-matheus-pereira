package com.pucminas.sgi.exception;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

@DisplayName("ResourceNotFoundException")
class ResourceNotFoundExceptionTest {

    @Test
    @DisplayName("construtor com mensagem")
    void construtorMensagem() {
        String msg = "Recurso não encontrado";
        ResourceNotFoundException ex = new ResourceNotFoundException(msg);
        assertEquals(msg, ex.getMessage());
        assertNull(ex.getCause());
    }

    @Test
    @DisplayName("construtor com resource e id formata mensagem corretamente")
    void construtorResourceEId() {
        UUID id = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
        ResourceNotFoundException ex = new ResourceNotFoundException("Dívida", id);
        assertEquals("Dívida não encontrado(a) com identificador: 550e8400-e29b-41d4-a716-446655440000", ex.getMessage());
    }

    @Test
    @DisplayName("construtor com resource e id (string)")
    void construtorResourceEIdString() {
        ResourceNotFoundException ex = new ResourceNotFoundException("Cliente", "123");
        assertEquals("Cliente não encontrado(a) com identificador: 123", ex.getMessage());
    }
}
