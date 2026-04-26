package com.pucminas.sgi.exception;

/**
 * Exceção lançada quando uma regra de negócio é violada (422).
 */
public class BusinessRuleException extends RuntimeException {

    public BusinessRuleException(String message) {
        super(message);
    }
}
