package com.pucminas.sgi.exception;

/**
 * Falha na comunicação com APIs Sicoob.
 */
public class SicoobApiException extends RuntimeException {

    private final int statusCode;

    public SicoobApiException(String message) {
        super(message);
        this.statusCode = 0;
    }

    public SicoobApiException(String message, int statusCode) {
        super(message);
        this.statusCode = statusCode;
    }

    public SicoobApiException(String message, Throwable cause) {
        super(message, cause);
        this.statusCode = 0;
    }

    public int getStatusCode() {
        return statusCode;
    }
}
