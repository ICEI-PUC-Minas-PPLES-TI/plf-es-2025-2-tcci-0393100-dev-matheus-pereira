package com.pucminas.sgi.exception;

/**
 * Exceção lançada quando falha o envio de email (500).
 */
public class EmailSendException extends RuntimeException {

    public EmailSendException(String message) {
        super(message);
    }

    public EmailSendException(String message, Throwable cause) {
        super(message, cause);
    }
}
