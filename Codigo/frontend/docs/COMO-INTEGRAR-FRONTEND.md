# Como integrar o frontend ao backend (Spring Boot SGI)

## 1. Pré-requisitos

- Backend Spring Boot rodando em **http://localhost:8080** (ou na URL que você configurar).
- Node.js e npm instalados no ambiente do frontend.

## 2. Configuração da base URL

No diretório do frontend, crie ou edite o arquivo **`.env`** (copie de `.env.example` se necessário):

```env
# URL do backend (obrigatório para usar API real)
VITE_API_URL=http://localhost:8080

# false = usa a API real. true = usa mock em memória (não precisa do backend)
VITE_USE_MOCK=false
```

- Com **`VITE_USE_MOCK=false`**, o front faz as requisições para `VITE_API_URL`.
- Com **`VITE_USE_MOCK=true`**, o front ignora o backend e usa dados em memória (útil para desenvolver sem subir o backend).

Se **`VITE_API_URL`** estiver vazio, o Vite usa o proxy definido em `vite.config.ts` (target `http://localhost:8080`). Para evitar CORS em desenvolvimento, o backend deve liberar `http://localhost:5173` (e `http://localhost:3000` se usar outra porta).

## 3. Autenticação (JWT)

1. **Login**  
   O front chama `POST /api/auth/login` com:
   ```json
   { "telefone": "31999999999", "senha": "admin123" }
   ```
   O backend retorna algo como:
   ```json
   { "token": "<JWT>", "perfil": "ADMIN", "nome": "...", "telefone": "..." }
   ```

2. **Armazenamento do token**  
   O front guarda o `token` no `localStorage` com a chave `sgi_token`.

3. **Requisições seguintes**  
   O cliente HTTP (axios) envia em todas as chamadas o header:
   ```
   Authorization: Bearer <token>
   ```
   (já configurado em `src/lib/api.ts`).

4. **401**  
   Se o backend responder 401, o front remove o token e o usuário precisa fazer login de novo.

## 4. Endpoints usados pelo frontend

| Uso no front | Método | Endpoint | Observação |
|--------------|--------|----------|------------|
| Login | POST | `/api/auth/login` | Body: `{ telefone, senha }` |
| Listar clientes | GET | `/api/clientes?page=0&size=100` | Resposta paginada: `content[]` |
| Cadastrar cliente | POST | `/api/clientes` | Body: nome, cpfCnpj (ou cpf), telefone, email, etc. |
| Atualizar cliente | PATCH | `/api/clientes/{id}` | Atualização parcial |
| Excluir cliente | DELETE | `/api/clientes/{id}` | Exclusão lógica (inativo) |
| Listar inadimplências | GET | `/api/inadimplentes?paginado=false` | Array de dívidas |
| Registrar inadimplência | POST | `/api/inadimplentes` | Body: clienteId, valor (reais), vencimento?, descricao? |
| Confirmar pagamento | PATCH | `/api/inadimplentes/{id}` | Body: `{ "status": "Pago" }` |
| Resumo (dashboard) | GET | `/api/relatorios/resumo?dias=30` | totalClientes, totalDividas, totalEmAberto, totalPago |
| Ranking devedores | GET | `/api/relatorios/ranking-devedores` | Query: limit, periodo, etc. |
| Extrato cliente | GET | `/api/relatorios/extrato-cliente/{id}` | Dados do cliente e dívidas |
| Inadimplência período | GET | `/api/relatorios/inadimplencia-periodo?dataInicio=&dataFim=` | Relatório por período |

## 5. Valores monetários

### Geral (inadimplências, resumo, relatórios)
Valores em **reais** (ex.: R$ 1.000,00 = `1000`). Configurado em `src/lib/apiNormalizers.ts` (VALOR_CENTAVOS = false).

### Serviços (GET /api/servicos, GET /api/servicos/todos)
- **Respostas:** `valorPadrao` em **reais** (ex.: 150 = R$ 150,00). O frontend exibe diretamente.
- **Envios (POST/PUT):** `valorPadrao` em **centavos** (ex.: 15000 para R$ 150,00). O frontend converte antes de enviar.

### Dívidas com itensServicos (GET /api/dividas, POST /api/dividas)
- **Respostas:** `valor` de cada item em **reais**.
- **Envios (POST):** `valor` de cada item em **centavos**.

## 6. Como rodar e testar

1. Subir o backend na porta 8080.
2. No frontend:
   - `.env`: `VITE_API_URL=http://localhost:8080` e `VITE_USE_MOCK=false`.
   - `npm install` (se ainda não fez).
   - `npm run dev`.
3. Acessar o front (ex.: http://localhost:5173), fazer login com **telefone** e **senha** de um usuário cadastrado no backend.
4. Conferir clientes, inadimplentes, relatórios e dashboard usando a API real.

## 7. Documentação da API (backend)

- **Swagger:** http://localhost:8080/swagger-ui.html (com o backend rodando).
- **Contrato detalhado:** `docs/RELATORIO-BACKEND-FRONTEND.md` ou `docs/CONTRATO-API-BACKEND.md` neste repositório.

## 8. CORS

O backend deve permitir a origem do frontend (ex.: `http://localhost:5173`). Se o front rodar em outra porta, inclua essa origem na configuração CORS do backend.
