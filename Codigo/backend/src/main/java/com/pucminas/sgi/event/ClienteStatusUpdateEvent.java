package com.pucminas.sgi.event;

import java.util.UUID;

/**
 * Evento publicado após commit de operações que alteram dívidas do cliente,
 * para atualizar saldo e status do cliente em transação separada (evita SQLITE_BUSY).
 */
public record ClienteStatusUpdateEvent(UUID clienteId) {}
