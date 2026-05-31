package com.pucminas.sgi.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuração da integração Sicoob (Cobrança Bancária v3 + Pix recebimentos).
 */
@Component
@ConfigurationProperties(prefix = "sicoob")
@Getter
@Setter
public class SicoobProperties {

    /** Habilita integração real ou mock. */
    private boolean enabled = false;

    /** Em true, não chama APIs externas (útil em dev/TCC sem certificado). */
    private boolean mock = true;

    private String clientId = "";

    private String tokenUrl = "https://auth.sicoob.com.br/auth/realms/cooperado/protocol/openid-connect/token";

    private String pixBaseUrl = "https://api.sicoob.com.br/pix/api/v2";

    private String cobrancaBaseUrl = "https://api.sicoob.com.br/cobranca-bancaria/v3";

    /** Caminho do certificado A1 (.pfx ou .p12). */
    private String certificatePath = "";

    private String certificatePassword = "";

    /** Escopos OAuth separados por espaço. */
    private String scopes = "cob.read cob.write pix.read webhook.read webhook.write";

    /** Chave Pix do cooperado (e-mail, CPF/CNPJ, telefone ou aleatória). */
    private String pixChave = "";

    /** Expiração da cobrança Pix imediata (segundos). */
    private int pixExpiracaoSegundos = 86400;

    /** Dados da conta para boleto (Cobrança Bancária v3). */
    private long numeroCliente = 0;

    private int numeroContaCorrente = 0;

    private int codigoModalidade = 1;

    private int numeroContratoCobranca = 1;

    /** Segredo para validar POST do webhook (header X-Sicoob-Webhook-Secret). */
    private String webhookSecret = "";

    /** URL pública base do backend (para registrar webhook Pix). */
    private String webhookUrlBase = "";

    public boolean isConfiguredForApi() {
        return enabled && !mock && clientId != null && !clientId.isBlank()
                && certificatePath != null && !certificatePath.isBlank();
    }
}
