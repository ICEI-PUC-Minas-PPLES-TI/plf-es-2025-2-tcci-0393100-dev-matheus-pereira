package com.pucminas.sgi.util;

import com.pucminas.sgi.exception.BusinessRuleException;

import java.util.regex.Pattern;

/**
 * Normalização e validação de telefone fixo e celular de clientes.
 * Fixo: 8 dígitos (local) ou 10 dígitos (legado com DDD). Celular: 10 ou 11 dígitos com DDD.
 */
public final class TelefoneClienteUtil {

    private static final Pattern EMAIL_VALIDO = Pattern.compile(
            "^[\\w.+-]+@[\\w.-]+\\.[a-zA-Z]{2,}$");

    private TelefoneClienteUtil() {
    }

    public static String apenasDigitos(String valor) {
        if (valor == null) {
            return null;
        }
        String digits = valor.replaceAll("\\D", "");
        return digits.isEmpty() ? null : digits;
    }

    public static String normalizarOpcional(String valor) {
        return apenasDigitos(valor);
    }

    public static String normalizarEmailOpcional(String email) {
        if (email == null) {
            return null;
        }
        String trimmed = email.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /** Normaliza e-mail vazio para null; valida formato se informado. */
    public static String normalizarEValidarEmail(String email) {
        String normalized = normalizarEmailOpcional(email);
        if (normalized != null && !EMAIL_VALIDO.matcher(normalized).matches()) {
            throw new BusinessRuleException("E-mail inválido");
        }
        return normalized;
    }

    public static void validarTelefoneFixo(String telefone) {
        if (telefone == null) {
            return;
        }
        int len = telefone.length();
        if (len != 8 && len != 10) {
            throw new BusinessRuleException(
                    "Telefone fixo inválido. Informe 8 dígitos (sem DDD) ou 10 dígitos (com DDD).");
        }
    }

    public static void validarCelular(String celular) {
        if (celular == null) {
            return;
        }
        int len = celular.length();
        if (len != 10 && len != 11) {
            throw new BusinessRuleException(
                    "Celular inválido. Informe 10 ou 11 dígitos com DDD.");
        }
    }

    public static void validarContatos(String telefone, String celular) {
        validarTelefoneFixo(telefone);
        validarCelular(celular);
    }
}
