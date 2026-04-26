package com.pucminas.sgi.exception;

/**
 * Exceção lançada quando há tentativa de duplicar recurso único (409).
 */
public class DuplicateResourceException extends RuntimeException {

    public DuplicateResourceException(String message) {
        super(message);
    }
}
