package com.pucminas.sgi.enums;

/**
 * Status da dívida em relação ao pagamento.
 */
public enum StatusDivida {
    EM_ABERTO,
    PARCIAL,
    QUITADA,
    VENCIDA,
    /** Inadimplência cancelada (soft delete) – não aparece na listagem. */
    CANCELADA
}
