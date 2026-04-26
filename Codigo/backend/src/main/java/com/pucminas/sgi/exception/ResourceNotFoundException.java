package com.pucminas.sgi.exception;

/**
 * Exceção lançada quando um recurso não é encontrado (404).
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }

    public ResourceNotFoundException(String resource, Object id) {
        super(String.format("%s não encontrado(a) com identificador: %s", resource, id));
    }
}
