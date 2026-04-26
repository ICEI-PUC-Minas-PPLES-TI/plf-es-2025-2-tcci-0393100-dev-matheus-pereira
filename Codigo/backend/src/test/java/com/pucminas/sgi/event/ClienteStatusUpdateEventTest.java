package com.pucminas.sgi.event;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

@DisplayName("ClienteStatusUpdateEvent")
class ClienteStatusUpdateEventTest {

    @Test
    @DisplayName("record retorna clienteId informado")
    void retornaClienteId() {
        UUID id = UUID.randomUUID();
        ClienteStatusUpdateEvent event = new ClienteStatusUpdateEvent(id);
        assertEquals(id, event.clienteId());
    }

    @Test
    @DisplayName("dois eventos com mesmo id são iguais")
    void igualdade() {
        UUID id = UUID.randomUUID();
        ClienteStatusUpdateEvent a = new ClienteStatusUpdateEvent(id);
        ClienteStatusUpdateEvent b = new ClienteStatusUpdateEvent(id);
        assertEquals(a, b);
        assertEquals(a.hashCode(), b.hashCode());
    }
}
