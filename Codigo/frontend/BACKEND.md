# Integração com o backend

## Modo mock (testar sem backend)

Com **`VITE_USE_MOCK=true`** no `.env`, o front usa **dados em memória** em vez da API real. Você pode:

- **Cadastrar clientes** (menu Clientes → Novo Cliente → Salvar)
- **Registrar inadimplências** (menu Inadimplentes → Registrar inadimplência → escolher cliente, valor, vencimento)
- Ver **listagem de clientes** e **lista de inadimplentes** com o que você cadastrou
- Ver **Dashboard** e **Relatórios** com totais calculados a partir desses dados

Os dados **não são salvos em banco**: ao recarregar a página, tudo volta a ficar vazio. Para usar o backend de verdade, altere para `VITE_USE_MOCK=false` ou remova a variável.

---

## Por que aparece "Erro de conexão. Verifique se o backend está em execução."

Essa mensagem aparece quando o **frontend não consegue falar com a API**:

1. **Backend parado** – O servidor da API não está rodando.
2. **Porta errada** – Em desenvolvimento o front espera o backend em **`http://localhost:18080`** (proxy do Vite).
3. **URL em produção** – No build de produção é usada a variável **`VITE_API_URL`** no `.env`. Se estiver vazia ou errada, as chamadas falham.

### Como testar o front (cadastrar cliente, inadimplência etc.)

1. **Subir o backend** na porta que o front usa:
   - Com **proxy** (recomendado em dev): backend em **`http://localhost:18080`**.
   - Deixe o `.env` com `VITE_API_URL=` vazio; o Vite redireciona `/api/*` para `http://localhost:18080`.

2. **Rodar o front:**
   ```bash
   npm run dev
   ```
   Acesse `http://localhost:5173` (ou a porta que o Vite mostrar).

3. **Fluxos para testar:**
   - **Clientes:** menu Clientes → "Novo Cliente" → preencher e Salvar (chama `POST /api/clientes`).
   - **Inadimplentes:** menu Inadimplentes → "Registrar inadimplência" → escolher cliente, valor, vencimento (chama `POST /api/inadimplentes` e `GET /api/clientes`).
   - **Relatórios / Dashboard:** carregam `GET /api/relatorios/resumo` e listagens.

4. **Se o backend usar outra porta (ex.: 8080):**
   - No `vite.config.ts`, em `server.proxy['/api'].target`, coloque `http://localhost:8080`, **ou**
   - No `.env`: `VITE_API_URL=http://localhost:8080` (aí as requisições vão direto para o backend; o backend precisa liberar CORS para a origem do front).

### Resumo

| Situação              | O que fazer |
|-----------------------|-------------|
| Backend na porta 18080 | Deixar `VITE_API_URL` vazio e rodar `npm run dev`. |
| Backend em outra porta | Ajustar `proxy` no `vite.config.ts` ou definir `VITE_API_URL` no `.env`. |
| Produção               | Definir `VITE_API_URL` com a URL real da API antes do `npm run build`. |

Enquanto o backend não estiver no ar, essas telas vão continuar mostrando "Erro de conexão" ou "Nenhum cliente encontrado" (no caso de listas vazias ou falha na API).
