# Relatório: Frontend – Página de Cálculos da Reforma Tributária

Este documento descreve o que o **frontend** deve implementar para a página de cálculos tributários (CBS/IBS) e uso da IA (Gemini), com base no backend já disponível.

---

## 1. Configuração da API Gemini no backend

A chave da API do Gemini **não deve ser commitada** no código. Configure assim:

- **Variável de ambiente:** `GEMINI_API_KEY=sua_chave_aqui`
- Ou, apenas em ambiente local (não commitar): em `application.properties` adicione `gemini.api.key=sua_chave`

Sem a chave, o endpoint de consulta à IA retorna uma mensagem informando que a consulta não está disponível.

---

## 2. Endpoints disponíveis (todos exigem autenticação JWT)

Base URL: `http://localhost:8080` (ou sua URL da API).  
Header obrigatório: `Authorization: Bearer <token>`.

---

### 2.1 POST `/api/tributos/calcular`

Calcula tributo conforme o tipo e categoria.

**Request (JSON):**
```json
{
  "tipo": "POR_DENTRO | POR_FORA | SEPARAR_CBS_IBS | MARGEM_LUCRO",
  "valor": 100.00,
  "categoria": "PLENO | REDUZIDO | ZERO",
  "custoAquisicao": 50.00,
  "margemDesejada": 0.30
}
```

- **tipo** (obrigatório):  
  - `POR_DENTRO`: valor já inclui imposto; retorna base de cálculo e imposto.  
  - `POR_FORA`: valor é a base; retorna imposto e valor total.  
  - `SEPARAR_CBS_IBS`: valor já inclui imposto; retorna base, CBS, IBS e totais.  
  - `MARGEM_LUCRO`: exige `custoAquisicao` e `margemDesejada`; retorna preço de venda, margem e impostos.
- **valor** (obrigatório): valor em reais (ex.: 100 = R$ 100,00).
- **categoria** (opcional): `PLENO` (padrão), `REDUZIDO` ou `ZERO`.
- **custoAquisicao** e **margemDesejada**: obrigatórios apenas quando `tipo` = `MARGEM_LUCRO`. Margem em decimal (ex.: 0.30 = 30%).

**Response 200:** objeto com campos conforme o tipo, por exemplo:
- `baseCalculo`, `valorImposto`, `valorSemImposto`, `valorTotal`
- `cbs`, `ibs`, `totalImpostos`
- `precoVenda`, `margemLucro`, `custoAquisicao` (para MARGEM_LUCRO)
- `tipo`, `categoria`

Todos os valores monetários vêm em **reais** (ex.: 26.70).

---

### 2.2 GET `/api/tributos/aliquotas/{categoria}`

Retorna as alíquotas (CBS, IBS e total) da categoria.

- **categoria:** `PLENO`, `REDUZIDO` ou `ZERO`.

**Response 200:**
```json
{
  "categoria": "PLENO",
  "cbs": 0.088,
  "ibs": 0.179,
  "total": 0.267
}
```

Use para exibir as alíquotas na tela (ex.: “CBS 8,8%”, “IBS 17,9%”, “Total 26,7%”) e para validações no front.

---

### 2.3 POST `/api/tributos/creditos/validar`

Calcula crédito tributário (não-cumulatividade): imposto na saída, crédito na entrada e imposto devido.

**Request (JSON):**
```json
{
  "valorVenda": 1000.00,
  "valorCompras": 600.00,
  "categoria": "PLENO"
}
```

**Response 200:**
```json
{
  "impostoSaida": 267.00,
  "creditoEntrada": 160.20,
  "impostoDevido": 106.80,
  "creditoAcumulado": 0,
  "categoria": "PLENO"
}
```

Valores em reais.

---

### 2.4 GET `/api/tributos/regime/{cnpj}`

Retorna alíquotas do “regime” do CNPJ. Hoje o backend devolve sempre o regime **PLENO** (mesmo formato de alíquotas). Use para exibir regime sugerido ou placeholder até integração com base oficial.

---

### 2.5 POST `/api/tributos/nota-fiscal/gerar`

Calcula totais de uma nota fiscal (soma de itens com valor já incluindo imposto).

**Request (JSON):**
```json
{
  "categoria": "PLENO",
  "itens": [
    { "nome": "Produto A", "valorTotal": 100.00 },
    { "nome": "Produto B", "valorTotal": 250.00 }
  ]
}
```

**Response 200:**
```json
{
  "subtotal": 276.86,
  "cbs": 24.36,
  "ibs": 49.55,
  "totalImpostos": 73.91,
  "totalNota": 350.77,
  "aliquotaEfetivaPercentual": 26.70,
  "categoria": "PLENO"
}
```

Valores em reais; `aliquotaEfetivaPercentual` em % (ex.: 26.70 = 26,70%).

---

### 2.6 POST `/api/tributos/consulta-ia`

Envia uma pergunta ao Gemini sobre reforma tributária e retorna a resposta em texto.

**Importante:** use **POST** (não GET) e envie o body em **JSON** com header `Content-Type: application/json`.

**Request (JSON):**
```json
{
  "pergunta": "Como funciona o crédito de CBS nas operações interestaduais?",
  "contexto": "Empresa no regime pleno, vendas para SP e MG."
}
```

- **pergunta** (obrigatório): texto da pergunta.
- **contexto** (opcional): informações adicionais para refinar a resposta.

**Response 200:**
```json
{
  "sucesso": true,
  "resposta": "Texto longo retornado pelo Gemini...",
  "erro": null
}
```

Em caso de falha (ex.: chave não configurada, erro de rede), o backend retorna 200 com `sucesso: false` e `erro` preenchido, ou `sucesso: true` e `resposta` contendo a mensagem de erro amigável. O front deve exibir `resposta` ou `erro` conforme o caso.

---

### 2.7 GET `/api/tributos/cashback`

Calcula o cashback de CBS (ex.: devolução para baixa renda).

**Query params:**
- `valorCompra` (obrigatório): valor da compra em reais.
- `percentualDevolucao` (opcional): 0 a 1 (ex.: 1 = 100%). Default 1.

**Response 200:**
```json
{
  "cashbackCBS": 8.09
}
```

Valor em reais.

---

## 3. O que o front deve ter (sugestão de telas e fluxos)

### 3.1 Página principal: “Reforma Tributária” ou “Cálculos Tributários”

- **Menu:** item “Reforma Tributária” ou “Cálculos CBS/IBS” apontando para essa página.
- **Bloco de alíquotas:**  
  Chamar `GET /api/tributos/aliquotas/PLENO` (e opcionalmente REDUZIDO/ZERO) e exibir em cards ou tabela: CBS 8,8%, IBS 17,9%, Total 26,7%, e aviso de que são estimativas.

### 3.2 Abas ou seções de cálculo

1. **Por dentro**  
   - Campo: valor total (já com imposto).  
   - Botão “Calcular”.  
   - Request: `POST /api/tributos/calcular` com `tipo: "POR_DENTRO"`, `valor` e `categoria`.  
   - Exibir: base de cálculo, valor do imposto, valor sem imposto (e valor total).

2. **Por fora**  
   - Campo: valor base (sem imposto).  
   - Request: `tipo: "POR_FORA"`.  
   - Exibir: base, imposto, valor total.

3. **Separar CBS e IBS**  
   - Campo: valor total (com imposto).  
   - Request: `tipo: "SEPARAR_CBS_IBS"`.  
   - Exibir: base, CBS, IBS, total de impostos, valor sem impostos.

4. **Margem de lucro**  
   - Campos: custo de aquisição, margem desejada (%), categoria.  
   - Request: `tipo: "MARGEM_LUCRO"`, `custoAquisicao`, `margemDesejada` (ex.: 0.30 para 30%).  
   - Exibir: preço de venda sugerido, margem em R$, impostos.

5. **Crédito tributário**  
   - Campos: valor da venda, valor das compras, categoria.  
   - Request: `POST /api/tributos/creditos/validar`.  
   - Exibir: imposto saída, crédito entrada, imposto devido, crédito acumulado (se houver).

6. **Nota fiscal**  
   - Lista de itens: nome + valor total (com imposto). Botão adicionar/remover linha.  
   - Request: `POST /api/tributos/nota-fiscal/gerar`.  
   - Exibir: subtotal, CBS, IBS, total impostos, total da nota, alíquota efetiva %.

7. **Cashback**  
   - Campo: valor da compra; opcional: percentual de devolução.  
   - Request: `GET /api/tributos/cashback?valorCompra=...&percentualDevolucao=1`.  
   - Exibir: valor do cashback CBS em R$.

### 3.3 Consulta à IA (Gemini)

- **Área “Dúvidas sobre a Reforma” ou “Pergunte à IA”:**
  - Campo de texto (pergunta).
  - Campo opcional (contexto).
  - Botão “Enviar” ou “Perguntar”.
  - Request: `POST /api/tributos/consulta-ia` com `pergunta` e `contexto`.
  - Exibir a `resposta` em um bloco de texto (markdown se o backend passar formatado; senão texto simples).
- Aviso na tela: “As informações são orientativas. Consulte sempre a legislação e um profissional.”

### 3.4 Regime por CNPJ (opcional)

- Campo CNPJ.
- Request: `GET /api/tributos/regime/{cnpj}`.
- Exibir as alíquotas retornadas como “regime sugerido” ou “regime padrão”, até haver integração com base oficial.

---

## 4. Valores e formato

- **Envio:** valores monetários em **reais** (ex.: 100, 1500.50).  
- **Resposta:** o backend devolve valores em **reais** nos endpoints de tributos.  
- **Categoria:** sempre um dos literais `PLENO`, `REDUZIDO`, `ZERO`.  
- **Margem:** enviar em decimal (ex.: 0.30 para 30%); exibir em % para o usuário.

---

## 5. Checklist resumido para o front

- [ ] Menu ou link para a página “Reforma Tributária” / “Cálculos CBS/IBS”.
- [ ] Chamar `GET /api/tributos/aliquotas/{categoria}` e exibir alíquotas.
- [ ] Formulário “Por dentro” e chamada a `POST /api/tributos/calcular` (tipo POR_DENTRO).
- [ ] Formulário “Por fora” (tipo POR_FORA).
- [ ] Formulário “Separar CBS e IBS” (tipo SEPARAR_CBS_IBS).
- [ ] Formulário “Margem de lucro” (tipo MARGEM_LUCRO com custo e margem).
- [ ] Formulário “Crédito tributário” e `POST /api/tributos/creditos/validar`.
- [ ] Formulário “Nota fiscal” (lista de itens) e `POST /api/tributos/nota-fiscal/gerar`.
- [ ] Cálculo de cashback e `GET /api/tributos/cashback`.
- [ ] Área “Consulta IA” e `POST /api/tributos/consulta-ia`.
- [ ] Exibir aviso de que alíquotas são estimativas e que a IA é orientativa.
- [ ] Tratar erros (4xx/5xx) e mensagens de “chave não configurada” na consulta IA.

Com isso, o front cobre todos os endpoints do backend e oferece a experiência de cálculos da reforma tributária e consulta à IA conforme o contrato da API.
