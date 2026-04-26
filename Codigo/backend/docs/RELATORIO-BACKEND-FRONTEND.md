# Relatório: Compatibilidade Backend × Frontend (SGI)

Este documento lista todos os endpoints, payloads e campos da API do backend para você conferir se o frontend está usando as mesmas URLs, métodos e formatos.

**Base URL da API:** `http://localhost:8080` (ou a URL configurada no frontend)

**Autenticação:** Endpoints protegidos exigem header `Authorization: Bearer <token>` (token retornado no login).

---

## 1. Autenticação — `/api/auth`

| Método | Endpoint | Descrição | Auth? |
|--------|----------|-----------|-------|
| POST | `/api/auth/login` | Login (login + senha) | Não |
| POST | `/api/auth/logout` | Logout (cliente descarta o token) | Sim |
| GET | `/api/auth/me` | Dados do usuário logado | Sim |

### POST `/api/auth/login`

**Request (JSON):**
```json
{
  "login": "string (obrigatório - telefone ou nome de usuário)",
  "senha": "string (obrigatório)"
}
```

**Response 200:**
```json
{
  "token": "string (JWT)",
  "perfil": "ADMIN | OPERADOR | VISUALIZADOR",
  "nome": "string",
  "login": "string"
}
```

**Frontend deve:** enviar `login` e `senha`; guardar `token` e enviar em `Authorization: Bearer <token>` nas requisições seguintes.

---

### GET `/api/auth/me`

**Response 200:**
```json
{
  "usuarioId": "uuid",
  "login": "string",
  "nome": "string",
  "perfil": "ADMIN | OPERADOR | VISUALIZADOR",
  "statusUsuario": "ATIVO | INATIVO",
  "ultimoAcesso": "datetime (ISO)",
  "criadoEm": "datetime (ISO)"
}
```

---

## 2. Usuários — `/api/usuarios`

| Método | Endpoint | Descrição | Auth? |
|--------|----------|-----------|-------|
| POST | `/api/usuarios` | Cadastrar usuário | Sim |

### POST `/api/usuarios`

**Request (JSON):**
```json
{
  "nome": "string (obrigatório)",
  "email": "string",
  "ativo": true | false,
  "telefone1": "string",
  "telefone2": "string",
  "funcao": "string",
  "permissao": "string (mapeado para perfil)",
  "planta": "string",
  "senha": "string",
  "login": "string (alternativa para telefone)"
}
```

**Response:** `201 Created` (body vazio).

**Backend:** usa `login` ou `telefone1` como telefone do usuário; `permissao` é mapeado para o enum `Perfil`.

---

## 3. Clientes — `/api/clientes`

| Método | Endpoint | Descrição | Auth? |
|--------|----------|-----------|-------|
| POST | `/api/clientes` | Cadastrar cliente | Sim |
| GET | `/api/clientes` | Listar (filtros + paginação) | Sim |
| GET | `/api/clientes/ranking-devedores` | Top N maiores devedores | Sim |
| GET | `/api/clientes/{id}` | Consultar por ID | Sim |
| PUT | `/api/clientes/{id}` | Atualizar (completo) | Sim |
| PATCH | `/api/clientes/{id}` | Atualização parcial | Sim |
| DELETE | `/api/clientes/{id}` | Excluir (soft delete → inativo) | Sim |
| GET | `/api/clientes/{id}/dividas` | Listar dívidas do cliente | Sim |

### POST `/api/clientes`

**Request (JSON):**
```json
{
  "nome": "string (obrigatório)",
  "cpfCnpj": "string (obrigatório)",
  "email": "string",
  "telefone": "string",
  "endereco": "string",
  "statusCliente": "ATIVO | INADIMPLENTE | INATIVO",
  "saldoDevedor": number
}
```
- **Alias:** o backend aceita `"cpf"` no lugar de `"cpfCnpj"` (para compatibilidade com o front).

**Response 201:**
```json
{
  "clienteId": "uuid",
  "nome": "string",
  "cpfCnpj": "string",
  "email": "string",
  "telefone": "string",
  "endereco": "string",
  "statusCliente": "ATIVO | INADIMPLENTE | INATIVO",
  "saldoDevedor": number,
  "criadoEm": "datetime (ISO)",
  "atualizadoEm": "datetime (ISO)"
}
```

### GET `/api/clientes`

**Query params:** `nome` (opcional), `status` (opcional: ATIVO, INADIMPLENTE, INATIVO), `page`, `size`, `sort` (padrão size=20).

**Response 200:** objeto de **paginação** do Spring:
```json
{
  "content": [ { ... ClienteResponseDTO ... } ],
  "totalElements": number,
  "totalPages": number,
  "size": number,
  "number": number,
  "first": boolean,
  "last": boolean
}
```

### GET `/api/clientes/{id}/dividas`

**Response 200:** array de dívidas (mesmo formato de `DividaResponseDTO`):
```json
[
  {
    "dividaId": "uuid",
    "clienteId": "uuid",
    "nomeCliente": "string",
    "valorOriginal": number,
    "valorDevedor": number,
    "vencimento": "date (YYYY-MM-DD)",
    "descricao": "string",
    "statusDivida": "EM_ABERTO | VENCIDA | PARCIAL | QUITADA",
    "protocolo": "string",
    "criadoEm": "datetime",
    "atualizadoEm": "datetime"
  }
]
```

---

## 4. Inadimplentes (contrato frontend) — `/api/inadimplentes`

| Método | Endpoint | Descrição | Auth? |
|--------|----------|-----------|-------|
| GET | `/api/inadimplentes` | Listar inadimplências | Sim |
| POST | `/api/inadimplentes` | Registrar inadimplência (nova dívida) | Sim |
| PATCH | `/api/inadimplentes/{id}` | Confirmar pagamento (status Pago) | Sim |
| DELETE | `/api/inadimplentes/{id}` | Cancelar inadimplência (soft delete; deixa de aparecer na listagem) | Sim |

### GET `/api/inadimplentes`

**Query params:** `paginado` (opcional, boolean). Se `paginado=true`, retorna **Page**; senão retorna **array** de itens.

**Response 200 (lista):**
```json
[
  {
    "id": "uuid (dividaId)",
    "clienteId": "uuid",
    "clienteNome": "string",
    "valor": number,
    "vencimento": "YYYY-MM-DD",
    "descricao": "string",
    "status": "EmAberto | Pago | Acordo",
    "createdAt": "datetime (ISO)",
    "updatedAt": "datetime (ISO)"
  }
]
```
- **Importante:** o backend devolve `id` (não `dividaId`), `createdAt` e `updatedAt` (aliases JSON).

**Response 200 (paginado, quando `paginado=true`):** mesmo formato de página do Spring (`content`, `totalElements`, etc.), com `content` sendo array do objeto acima.

### POST `/api/inadimplentes`

**Request (JSON):**
```json
{
  "clienteId": "uuid (obrigatório)",
  "valor": number (obrigatório, em REAIS; ex.: 1000 = R$ 1.000,00; o backend converte para centavos ao salvar)",
  "vencimento": "YYYY-MM-DD (opcional; padrão dia 4)",
  "descricao": "string"
}
```

**Response 201:** mesmo formato de um item da listagem (com `id`, `status`, `createdAt`, `updatedAt`).

### PATCH `/api/inadimplentes/{id}`

**Request (JSON):**
```json
{
  "status": "Pago"
}
```
- Backend aceita apenas `"Pago"` (case insensitive) para confirmar pagamento (registra pagamento no valor total devedor e marca como quitada).

**Response 200:** item atualizado (status `"Pago"`).

### DELETE `/api/inadimplentes/{id}`

- **{id}** deve ser o **UUID da dívida** (o mesmo `id` retornado na listagem GET).
- Faz soft delete: marca a dívida como cancelada; ela deixa de aparecer na listagem de inadimplentes.
- **Response 204:** sem corpo (sucesso).
- **Response 404:** dívida não encontrada (ex.: ID inválido ou já cancelada).

---

## 5. Dívidas — `/api/dividas`

| Método | Endpoint | Descrição | Auth? |
|--------|----------|-----------|-------|
| POST | `/api/dividas` | Registrar dívida | Sim |
| GET | `/api/dividas` | Listar (filtros + paginação) | Sim |
| GET | `/api/dividas/{id}` | Consultar dívida | Sim |
| PUT | `/api/dividas/{id}/status` | Atualizar status (recalcula multa/juros) | Sim |

### POST `/api/dividas`

**Request (JSON):**
```json
{
  "clienteId": "uuid",
  "valorOriginal": number,
  "vencimento": "YYYY-MM-DD (opcional)",
  "descricao": "string"
}
```

**Response 201:** `DividaResponseDTO` (dividaId, clienteId, nomeCliente, valorOriginal, valorDevedor, vencimento, descricao, statusDivida, protocolo, criadoEm, atualizadoEm).

### GET `/api/dividas`

**Query params:** `clienteId`, `status` (lista: EM_ABERTO, VENCIDA, PARCIAL, QUITADA), `periodoInicio`, `periodoFim` (YYYY-MM-DD), `page`, `size`, `sort`.

**Response 200:** página com `content` = array de `DividaResponseDTO`.

---

## 6. Pagamentos — `/api/pagamentos`

| Método | Endpoint | Descrição | Auth? |
|--------|----------|-----------|-------|
| POST | `/api/pagamentos` | Registrar pagamento | Sim |
| GET | `/api/pagamentos/divida/{dividaId}` | Listar por dívida | Sim |
| GET | `/api/pagamentos/{id}` | Consultar pagamento | Sim |

### POST `/api/pagamentos`

**Request (JSON):**
```json
{
  "dividaId": "uuid",
  "valorPago": number,
  "dataPagamento": "YYYY-MM-DD (opcional)",
  "formaPagamento": "string",
  "observacao": "string"
}
```

**Response 201:** recibo (ReciboDTO) com dados do pagamento e da dívida.

---

## 7. Notificações — `/api/notificacoes`

| Método | Endpoint | Descrição | Auth? |
|--------|----------|-----------|-------|
| POST | `/api/notificacoes/enviar-cobranca` | Enviar email de cobrança | Sim |
| GET | `/api/notificacoes/cliente/{clienteId}` | Histórico do cliente | Sim |
| POST | `/api/notificacoes/reprocessar-falhas` | Reprocessar falhas | Sim |

### POST `/api/notificacoes/enviar-cobranca`

**Request (JSON):**
```json
{
  "clienteId": "uuid (obrigatório)",
  "dividaId": "uuid (opcional; se omitido, envia resumo de todas em aberto)"
}
```

---

## 8. Relatórios — `/api/relatorios`

| Método | Endpoint | Descrição | Auth? |
|--------|----------|-----------|-------|
| GET | `/api/relatorios/resumo` | Resumo dashboard | Sim |
| GET | `/api/relatorios/ranking-devedores` | Ranking maiores devedores | Sim |
| GET | `/api/relatorios/ranking` | Ranking (alias) | Sim |
| GET | `/api/relatorios/inadimplentes` | Relatório inadimplentes | Sim |
| GET | `/api/relatorios/inadimplencia-periodo` | Inadimplência por período | Sim |
| GET | `/api/relatorios/extrato-cliente/{id}` | Extrato do cliente | Sim |
| GET | `/api/relatorios/resumo-financeiro` | Resumo financeiro | Sim |
| GET | `/api/relatorios/exportar/{tipo}` | Exportar PDF ou Excel | Sim |

### GET `/api/relatorios/resumo`

**Query params:** `dias` (opcional).

**Response 200 (contrato dashboard):**
```json
{
  "totalClientes": number,
  "totalDividas": number,
  "totalEmAberto": number,
  "totalPago": number
}
```

### GET `/api/relatorios/ranking-devedores`

**Query params:** `limit`, `periodo`, `valorMin`, `qtdDividas`, `diasAtraso` (alguns podem não afetar a query ainda).

**Response 200:**
```json
{
  "limite": number,
  "ranking": [
    {
      "clienteId": "uuid",
      "nomeCliente": "string",
      "cpfCnpj": "string",
      "saldoDevedor": number,
      "posicao": number
    }
  ]
}
```

### GET `/api/relatorios/inadimplencia-periodo`

**Query params:** `dataInicio`, `dataFim` (YYYY-MM-DD).

**Response 200:**
```json
{
  "periodoInicio": "date",
  "periodoFim": "date",
  "totalClientesInadimplentes": number,
  "valorTotalInadimplente": number,
  "itens": [
    {
      "nomeCliente": "string",
      "cpfCnpj": "string",
      "quantidadeDividas": number,
      "saldoDevedor": number,
      "dataVencimentoMaisAntiga": "date"
    }
  ]
}
```

### GET `/api/relatorios/extrato-cliente/{id}`

**Response 200:**
```json
{
  "cliente": {
    "nome": "string",
    "cpfCnpj": "string",
    "telefone": "string",
    "email": "string",
    "status": "string",
    "saldoDevedorTotal": number
  },
  "dividasAtivas": [
    {
      "id": "uuid",
      "protocolo": "string",
      "descricao": "string",
      "vencimento": "string (YYYY-MM-DD)",
      "valorOriginal": number,
      "valorDevido": number,
      "status": "string",
      "diasAtraso": number
    }
  ],
  "historicoPagamentos": [ ... ],
  "notificacoes": [ ... ]
}
```

### GET `/api/relatorios/exportar/{tipo}`

**Path:** `tipo` = `pdf` ou `excel`.  
**Query params:** `relatorio` (default `inadimplentes`), `periodoInicio`, `periodoFim`.  
**Response 200:** arquivo (application/pdf ou planilha).

---

## 9. Agendamentos — `/api/agendamentos`

| Método | Endpoint | Descrição | Auth? |
|--------|----------|-----------|-------|
| POST | `/api/agendamentos` | Criar agendamento | Sim |
| GET | `/api/agendamentos` | Listar | Sim |
| GET | `/api/agendamentos/{id}` | Consultar | Sim |
| PUT | `/api/agendamentos/{id}` | Atualizar | Sim |
| PATCH | `/api/agendamentos/{id}/ativar` | Ativar/desativar | Sim |

---

## 10. Configuração de e-mail — `/api/email-config`

| Método | Endpoint | Descrição | Auth? |
|--------|----------|-----------|-------|
| POST | `/api/email-config` | Criar/atualizar SMTP | Sim |
| GET | `/api/email-config` | Obter configuração ativa | Sim |
| POST | `/api/email-config/testar` | Testar envio | Sim |

---

## Checklist rápido (Frontend)

Use esta lista para marcar o que já está alinhado com o backend.

- [ ] **Auth:** Login com `login` e `senha`; uso de `Authorization: Bearer <token>`.
- [ ] **Auth/me:** Resposta com `usuarioId`, `perfil`, `nome`, `login`, `statusUsuario`, etc.
- [ ] **Clientes:** Cadastro aceita `cpf` ou `cpfCnpj`; listagem com paginação (`content`, `totalElements`).
- [ ] **Clientes:** PATCH e DELETE existem (atualização parcial e exclusão lógica).
- [ ] **Inadimplentes:** Listagem usa `id`, `createdAt`, `updatedAt` e `status` ("EmAberto" | "Pago" | "Acordo").
- [ ] **Inadimplentes:** POST com `clienteId`, `valor`, `vencimento` (opcional), `descricao`.
- [ ] **Inadimplentes:** PATCH `/{id}` com body `{ "status": "Pago" }` para confirmar pagamento.
- [ ] **Relatórios/resumo:** Campos `totalClientes`, `totalDividas`, `totalEmAberto`, `totalPago`.
- [ ] **Relatórios/ranking-devedores:** Objeto com `limite` e `ranking[]` (clienteId, nomeCliente, cpfCnpj, saldoDevedor, posicao).
- [ ] **Relatórios/inadimplencia-periodo:** Query `dataInicio`, `dataFim`; resposta com `itens[]`.
- [ ] **Relatórios/extrato-cliente/{id}:** Resposta com `cliente`, `dividasAtivas` (valorDevido, vencimento string), `historicoPagamentos`, `notificacoes`.
- [ ] **Usuários:** Cadastro com `nome`, `login` ou `telefone1`, `permissao`, `senha`, etc.
- [ ] **Valores:** Backend usa valores em **centavos** onde aplicável (dívidas, pagamentos); front deve exibir convertendo se necessário.

---

## Observações

1. **Datas:** Backend usa `YYYY-MM-DD` para datas e ISO-8601 para date-time.
2. **UUIDs:** Todos os IDs são UUID (string no JSON).
3. **Status de dívida (API inadimplentes):** Backend retorna `"EmAberto"`, `"Pago"`, `"Acordo"` (mapeado de EM_ABERTO, QUITADA, PARCIAL).
4. **CORS:** Backend tem CORS configurado; verifique `application.properties` / `CorsConfig` se o front rodar em outra origem.

Se algum endpoint ou campo do frontend não estiver listado aqui, compare com o Swagger (quando a aplicação estiver rodando): `http://localhost:8080/swagger-ui.html`.
