# Como integrar o frontend ao backend SGI

Este guia explica como conectar uma aplicação frontend (React, Vue, Angular, etc.) ao backend Spring Boot do SGI.

---

## 1. Pré-requisitos

- **Backend rodando:** `mvn spring-boot:run` (porta **8080** por padrão).
- **Base URL da API:** `http://localhost:8080` em desenvolvimento.

---

## 2. Configuração de ambiente no frontend

Crie um arquivo de ambiente para não hardcodar a URL da API.

**Exemplo (Vite / React):**

```env
# .env.development
VITE_API_URL=http://localhost:8080
```

```env
# .env.production
VITE_API_URL=https://sua-api-producao.com
```

**Uso no código (Vite):**

```js
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';
```

**Exemplo (Create React App):**

```env
REACT_APP_API_URL=http://localhost:8080
```

**Exemplo (Next.js):**

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

---

## 3. CORS (backend já configurado)

O backend aceita requisições destas origens por padrão:

- `http://localhost:5173` (Vite)
- `http://localhost:3000` (React/Next em geral)

Se o seu front rodar em **outra porta** (ex.: 4200, 5174), adicione no backend:

**`application.properties`:**

```properties
cors.allowed-origins=http://localhost:5173,http://localhost:3000,http://localhost:4200
```

Ou via variável de ambiente:

```bash
CORS_ALLOWED_ORIGINS=http://localhost:4200
```

O backend permite: **GET, POST, PUT, PATCH, DELETE, OPTIONS**, headers arbitrários e **credenciais** (cookies/auth header).

---

## 4. Autenticação (JWT)

### 4.1 Login

Envie **POST** para `/api/auth/login` com login (telefone ou nome de usuário) e senha:

```js
const response = await fetch(`${API_BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    login: 'josecarlos',   // ou telefone, ex: '11999999999'
    senha: 'suaSenha'
  })
});

const data = await response.json();
// { token, perfil, nome, login }
```

- **Sucesso (200):** guarde o `token` (JWT).
- **Erro (401):** corpo com `message`: ex. `"Login ou senha inválidos."`.

### 4.2 Guardar o token

Recomendado: **memória** ou **sessionStorage** (não coloque JWT em localStorage se houver risco de XSS).

```js
// Exemplo: após login bem-sucedido
sessionStorage.setItem('sgi_token', data.token);
sessionStorage.setItem('sgi_user', JSON.stringify({ nome: data.nome, perfil: data.perfil, login: data.login }));
```

### 4.3 Enviar o token nas requisições

Todas as rotas **exceto** `/api/auth/login` exigem o header:

```
Authorization: Bearer <token>
```

Exemplo com **fetch**:

```js
const token = sessionStorage.getItem('sgi_token');

fetch(`${API_BASE}/api/clientes`, {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
});
```

### 4.4 Tratar 401 (não autorizado)

Se o backend retornar **401**, o token pode estar inválido ou expirado. Redirecione para a tela de login e remova o token:

```js
if (response.status === 401) {
  sessionStorage.removeItem('sgi_token');
  sessionStorage.removeItem('sgi_user');
  // redirecionar para /login
}
```

### 4.5 Dados do usuário logado

**GET** `/api/auth/me` (com token) retorna o usuário:

```js
const res = await fetch(`${API_BASE}/api/auth/me`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const user = await res.json();
// { usuarioId, login, nome, perfil, statusUsuario, ultimoAcesso, criadoEm }
```

---

## 5. Cliente HTTP reutilizável (axios)

Centralizar a base URL e o token evita repetição. Exemplo com **axios**:

```js
// api/client.js (ou services/api.js)
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 'Content-Type': 'application/json' }
});

// Interceptor: coloca o token em toda requisição
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('sgi_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: trata 401 globalmente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('sgi_token');
      sessionStorage.removeItem('sgi_user');
      window.location.href = '/login'; // ou use seu router
    }
    return Promise.reject(error);
  }
);
```

Uso:

```js
import { api } from './api/client';

// GET
const { data } = await api.get('/clientes');
const { data: cliente } = await api.get(`/clientes/${id}`);

// POST
const { data } = await api.post('/clientes', { nome: 'João', cpfCnpj: '12345678900' });

// PATCH
await api.patch(`/clientes/${id}`, { telefone: '11988887777' });

// DELETE
await api.delete(`/clientes/${id}`);
```

---

## 6. Tratamento de erros da API

O backend devolve erros num formato padrão:

```json
{
  "timestamp": "2025-02-03T12:00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Nome é obrigatório; CPF/CNPJ é obrigatório",
  "path": "/api/clientes"
}
```

| Status | Situação típica |
|--------|------------------|
| 400 | Validação (campos obrigatórios, formato) |
| 401 | Não autenticado ou token inválido |
| 403 | Sem permissão (se houver regras por perfil) |
| 404 | Recurso não encontrado (ex.: cliente/dívida inexistente) |
| 409 | Conflito (ex.: recurso duplicado) |
| 422 | Regra de negócio (ex.: valor maior que o devedor) |
| 500 | Erro interno |

Exemplo de tratamento no front:

```js
try {
  const { data } = await api.post('/clientes', payload);
  // sucesso
} catch (err) {
  const status = err.response?.status;
  const message = err.response?.data?.message || 'Erro ao salvar.';
  if (status === 400) {
    // exibir message (pode ser lista de erros de validação)
  } else if (status === 401) {
    // redirecionar para login
  } else {
    // exibir message genérica
  }
}
```

---

## 7. Paginação (listas)

Endpoints como **GET** `/api/clientes` e **GET** `/api/inadimplentes?paginado=true` retornam o padrão Spring Page:

```json
{
  "content": [ ... ],
  "totalElements": 100,
  "totalPages": 5,
  "size": 20,
  "number": 0,
  "first": true,
  "last": false
}
```

No front, use:

- `content` → lista da página atual
- `totalElements` → total de itens
- `totalPages` → total de páginas
- `number` → página atual (0-based)
- `size` → tamanho da página

Exemplo de chamada com paginação:

```js
const page = 0;
const size = 20;
const { data } = await api.get('/clientes', {
  params: { page, size, nome: 'João' }
});
const { content, totalElements, totalPages } = data;
```

---

## 8. Datas e valores

- **Datas:** o backend usa `YYYY-MM-DD` (ex.: `"2025-02-04"`) e ISO-8601 para date-time. O front pode enviar nesse formato e exibir no fuso/local desejado.
- **Valores monetários:** o backend trabalha em **centavos**. Para exibir em reais, divida por 100 no front (ex.: `(valor / 100).toFixed(2)`).

---

## 9. Resumo dos passos no frontend

1. Definir **variável de ambiente** com a base URL da API.
2. Após **login**, guardar o **token** (ex.: sessionStorage) e opcionalmente dados do usuário.
3. Em **toda requisição** (exceto login), enviar `Authorization: Bearer <token>`.
4. Usar um **cliente HTTP** (axios/fetch) com interceptors para token e tratamento de 401.
5. Tratar erros usando o corpo padrão (`status`, `message`, `path`).
6. Para listas paginadas, usar `content`, `totalElements`, `totalPages`, `number`, `size`.
7. Exibir valores monetários convertendo centavos → reais quando for o caso.

---

## 10. Documentação da API (Swagger)

Com o backend rodando, a documentação interativa está em:

- **Swagger UI:** [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
- **OpenAPI JSON:** [http://localhost:8080/api-docs](http://localhost:8080/api-docs)

Use o Swagger para testar os endpoints e conferir request/response de cada rota. O contrato detalhado está em **`docs/RELATORIO-BACKEND-FRONTEND.md`**.
