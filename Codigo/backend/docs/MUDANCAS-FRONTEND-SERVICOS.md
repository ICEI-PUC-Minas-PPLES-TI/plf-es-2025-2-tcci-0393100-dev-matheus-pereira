# Mudanças no frontend – Serviços e modal na inadimplência

Este documento descreve as alterações necessárias no frontend para usar o catálogo de **serviços** e o **modal de seleção** ao registrar o valor da inadimplência, e para que o e-mail de cobrança liste os serviços prestados.

---

## 1. Resumo do que o backend passou a oferecer

- **Tabela de serviços:** catálogo de serviços que o escritório realiza (ex.: Escrituração Contábil, Folha de Pagamento).
- **Vínculo dívida × serviços com valor:** ao registrar uma dívida, o front envia uma lista de itens `{ servicoId, valor }`; o backend grava e usa no e-mail de cobrança.
- **E-mail:** quando houver dívida específica e itens de serviço vinculados, o corpo do e-mail inclui a seção “Serviços prestados” com **nome e valor** de cada item (ex.: “Escrituração Contábil Mensal: R$ 150,00”).

---

## 2. Novos endpoints (API)

### 2.1 Listar serviços ativos (para o modal)

- **GET** `/api/servicos`
- **Auth:** Bearer JWT (obrigatório)
- **Resposta:** `200` – array de objetos:

```json
[
  {
    "servicoId": "uuid",
    "nome": "Escrituração Contábil Mensal",
    "descricao": "Escrituração contábil mensal",
    "valorPadrao": null,
    "ativo": true
  }
]
```

- **Uso:** popular o modal de seleção (checkboxes ou multi-select) ao abrir o fluxo de “registrar inadimplência” ou “nova dívida”.
- **Observação:** `valorPadrao` está em **centavos** (se o backend passar em reais, documentar no front). Hoje o seed não preenche `valorPadrao`.

### 2.2 Listar todos os serviços (incluindo inativos)

- **GET** `/api/servicos/todos`
- **Auth:** Bearer JWT
- **Resposta:** mesmo formato do array acima, incluindo serviços inativos.
- **Uso:** tela administrativa de manutenção do catálogo (se houver).

### 2.3 Criar / atualizar serviço (opcional para o front)

- **POST** `/api/servicos` – corpo: `{ "nome": "...", "descricao": "...", "valorPadrao": number ou null, "ativo": true }`
- **PUT** `/api/servicos/{id}` – mesmo corpo.
- **Uso:** apenas se o front tiver tela de cadastro de serviços.

---

## 3. Alterações no fluxo de “registrar inadimplência / nova dívida”

### 3.1 Payload de criação de dívida

- **POST** `/api/dividas`
- **Corpo (resumido):** `clienteId`, `valorOriginal`, `vencimento`, `descricao`.
- **Campo opcional:** `itensServicos` – array de objetos `{ servicoId, valor }`. **Valor em centavos** (ex.: 15000 = R$ 150,00).

Exemplo:

```json
{
  "clienteId": "uuid-do-cliente",
  "valorOriginal": 15000,
  "vencimento": "2025-03-04",
  "descricao": "Referente março/2025",
  "itensServicos": [
    { "servicoId": "uuid-servico-1", "valor": 10000 },
    { "servicoId": "uuid-servico-2", "valor": 5000 }
  ]
}
```

- **Regras no front:**  
  - Ao abrir o modal de “valor da inadimplência”, carregar os serviços com **GET** `/api/servicos`.  
  - No modal, para cada serviço selecionado o usuário informa o **valor** cobrado (ou usar `valorPadrao` do serviço, se existir).  
  - Ao submeter, enviar no **POST** `/api/dividas` o array `itensServicos` com `servicoId` e `valor` (centavos) de cada item (ou omitir se nenhum).

### 3.2 Resposta da dívida (consulta / listagem)

- **GET** `/api/dividas/{id}` e **GET** `/api/dividas` (itens da página) incluem no objeto da dívida o campo **`itensServicos`** (array de `{ servicoId, nomeServico, valor }`). **Valor em centavos.**

Exemplo de item de dívida na resposta:

```json
{
  "dividaId": "...",
  "clienteId": "...",
  "nomeCliente": "...",
  "valorOriginal": 15000,
  "valorDevedor": 15000,
  "vencimento": "2025-03-04",
  "descricao": "...",
  "statusDivida": "EM_ABERTO",
  "protocolo": "DIV-...",
  "criadoEm": "...",
  "atualizadoEm": "...",
  "itensServicos": [
    { "servicoId": "...", "nomeServico": "Escrituração Contábil Mensal", "valor": 10000 },
    { "servicoId": "...", "nomeServico": "Folha de Pagamento", "valor": 5000 }
  ]
}
```

- **Uso no front:**  
  - Exibir na tela de detalhe da dívida a lista de serviços com nome e valor (ex.: “Escrituração: R$ 100,00”).  
  - Se houver edição de dívida no futuro, pré-preencher o modal com os itens já salvos (`servicoId` + `valor`).

---

## 4. Fluxo sugerido no front (modal ao registrar inadimplência)

1. Usuário abre “Registrar inadimplência” (ou “Nova dívida”) e escolhe o cliente (e valor, vencimento, descrição, etc.).
2. **Antes de enviar:** abrir um **modal** com título do tipo “Quais serviços foram prestados?”.
3. No modal:  
   - Chamar **GET** `/api/servicos` e listar os itens (ex.: checkboxes com `nome` e campo de valor).  
   - Usuário marca os serviços e informa o **valor** de cada um (em reais ou centavos; ao enviar, converter para centavos).
4. Ao confirmar o modal:  
   - Montar o payload do **POST** `/api/dividas` com `clienteId`, `valorOriginal`, `vencimento`, `descricao` e **`itensServicos`** = `[{ servicoId, valor }, ...]` (valor em centavos).
5. Após sucesso, o e-mail de cobrança (quando enviado para essa dívida) virá com a seção “Serviços prestados” contendo **nome e valor** de cada item.

---

## 5. Banco de dados (backend)

- **Tabelas:**  
  - `servico` – catálogo (servico_id, nome, descricao, valor_padrao, ativo).  
  - `divida_item_servico` – itens da dívida (id, divida_id, servico_id, **valor** em centavos).
- O backend usa `spring.jpa.hibernate.ddl-auto=update`; as tabelas são criadas/atualizadas ao subir a aplicação.

---

## 6. Checklist rápido para o front

- [ ] Chamar **GET** `/api/servicos` para popular o modal de serviços.
- [ ] Incluir **modal** “Serviços prestados” no fluxo de registrar inadimplência/nova dívida, com **campo de valor por serviço**.
- [ ] Enviar **`itensServicos`** no corpo do **POST** `/api/dividas`: `[{ servicoId, valor }]` (valor em centavos).
- [ ] Tratar o campo **`itensServicos`** nas respostas de dívida (detalhe e listagem) para exibir nome e valor de cada item.
- [ ] (Opcional) Tela de cadastro/edição de serviços usando **POST**/ **PUT** `/api/servicos` e **GET** `/api/servicos/todos`.

Com isso, o valor total da inadimplência continua sendo informado como hoje; além disso o usuário escolhe no modal **quais serviços** e **quanto cobrou por cada um**, e o e-mail de cobrança sai com a lista de serviços e valores (ex.: “Escrituração: R$ 100,00”).
