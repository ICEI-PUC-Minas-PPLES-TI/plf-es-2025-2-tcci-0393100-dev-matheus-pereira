# Integração Sicoob (Pix + Boleto)

APIs utilizadas conforme [Portal Developers Sicoob](https://developers.sicoob.com.br/portal/apis):

| API | Uso no SGI |
|-----|------------|
| **Pix recebimentos** | Cobrança imediata (QR / copia e cola) + webhook de baixa |
| **Cobrança bancária v3** | Emissão de boleto vinculado à dívida |

## Endpoints REST (JWT)

| Método | URL | Descrição |
|--------|-----|-----------|
| GET | `/api/sicoob/status` | Status da integração |
| POST | `/api/sicoob/dividas/{dividaId}/pix` | Emitir cobrança Pix |
| POST | `/api/sicoob/dividas/{dividaId}/boleto` | Emitir boleto |
| GET | `/api/sicoob/dividas/{dividaId}/cobrancas` | Listar cobranças da dívida |
| GET | `/api/sicoob/cobrancas/{cobrancaId}` | Detalhe da cobrança |

## Webhook (público)

| Método | URL |
|--------|-----|
| POST | `/api/sicoob/webhook/pix` |
| POST | `/api/sicoob/webhook/pix/pix` | (Sicoob pode acrescentar `/pix` à URL cadastrada) |

Header opcional: `X-Sicoob-Webhook-Secret` (valor de `sicoob.webhook-secret`).

Ao receber Pix, o sistema registra pagamento (`PIX_SICOOB`) e atualiza a dívida.

## Configuração

### Desenvolvimento / TCC (mock)

```properties
sicoob.enabled=true
sicoob.mock=true
```

Não exige certificado; retorna cobranças simuladas.

### Produção (API real)

1. Cadastre o app em [developers.sicoob.com.br](https://developers.sicoob.com.br/portal/dashboard).
2. Habilite **Pix recebimentos** e **Cobrança bancária v3**.
3. Configure variáveis de ambiente:

```bash
SICOOB_ENABLED=true
SICOOB_MOCK=false
SICOOB_CLIENT_ID=seu-client-id
SICOOB_CERTIFICATE_PATH=/caminho/certificado.pfx
SICOOB_CERTIFICATE_PASSWORD=senha
SICOOB_PIX_CHAVE=sua-chave-pix
SICOOB_NUMERO_CLIENTE=25546454
SICOOB_NUMERO_CONTA=12345
SICOOB_NUMERO_CONTRATO=1
SICOOB_WEBHOOK_URL_BASE=https://seu-backend.onrender.com
SICOOB_WEBHOOK_SECRET=segredo-forte
```

Autenticação: OAuth2 `client_credentials` + certificado **ICP-Brasil (mTLS)**.

## Render

Defina as variáveis acima no painel. O webhook deve apontar para a URL pública do backend.
