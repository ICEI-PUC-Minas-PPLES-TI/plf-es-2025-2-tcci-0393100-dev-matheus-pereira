package com.pucminas.sgi.config;

import com.pucminas.sgi.event.ClienteStatusUpdateEvent;
import com.pucminas.sgi.service.ClienteService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.UUID;

/**
 * Atualiza saldo e status do cliente após o commit da transação que alterou dívidas.
 * Evita SQLITE_BUSY (database locked) ao não abrir segunda transação durante a primeira.
 */
@Component
public class ClienteStatusUpdateListener {

    private static final Logger log = LoggerFactory.getLogger(ClienteStatusUpdateListener.class);

    private final ClienteService clienteService;

    public ClienteStatusUpdateListener(ClienteService clienteService) {
        this.clienteService = clienteService;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onClienteStatusUpdate(ClienteStatusUpdateEvent event) {
        UUID clienteId = event.clienteId();
        try {
            clienteService.atualizarStatusCliente(clienteId);
        } catch (Exception e) {
            log.warn("Falha ao atualizar saldo do cliente {} (após commit): {}", clienteId, e.getMessage());
        }
    }
}
