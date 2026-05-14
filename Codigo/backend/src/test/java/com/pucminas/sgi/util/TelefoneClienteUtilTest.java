package com.pucminas.sgi.util;

import com.pucminas.sgi.exception.BusinessRuleException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("TelefoneClienteUtil")
class TelefoneClienteUtilTest {

    @Test
    @DisplayName("normaliza e-mail vazio para null")
    void normalizarEmailOpcional_vazio() {
        assertThat(TelefoneClienteUtil.normalizarEmailOpcional("")).isNull();
        assertThat(TelefoneClienteUtil.normalizarEmailOpcional("   ")).isNull();
        assertThat(TelefoneClienteUtil.normalizarEmailOpcional("a@b.com")).isEqualTo("a@b.com");
    }

    @Test
    @DisplayName("aceita telefone fixo com 8 ou 10 digitos")
    void validarTelefoneFixo_ok() {
        TelefoneClienteUtil.validarTelefoneFixo("12345678");
        TelefoneClienteUtil.validarTelefoneFixo("3133334444");
    }

    @Test
    @DisplayName("rejeita telefone fixo com tamanho invalido")
    void validarTelefoneFixo_invalido() {
        assertThatThrownBy(() -> TelefoneClienteUtil.validarTelefoneFixo("1199999"))
                .isInstanceOf(BusinessRuleException.class);
    }

    @Test
    @DisplayName("aceita celular com 10 ou 11 digitos")
    void validarCelular_ok() {
        TelefoneClienteUtil.validarCelular("31988887777");
        TelefoneClienteUtil.validarCelular("3188887777");
    }

    @Test
    @DisplayName("rejeita celular com tamanho invalido")
    void validarCelular_invalido() {
        assertThatThrownBy(() -> TelefoneClienteUtil.validarCelular("12345678"))
                .isInstanceOf(BusinessRuleException.class);
    }

    @Test
    @DisplayName("e-mail invalido apos normalizacao lanca excecao")
    void normalizarEValidarEmail_invalido() {
        assertThatThrownBy(() -> TelefoneClienteUtil.normalizarEValidarEmail("nao-email"))
                .isInstanceOf(BusinessRuleException.class);
        assertThat(TelefoneClienteUtil.normalizarEValidarEmail("")).isNull();
    }
}
