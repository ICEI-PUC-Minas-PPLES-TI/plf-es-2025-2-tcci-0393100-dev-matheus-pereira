# Deploy do backend no Render

Documentação das alterações para hospedar o SGI na [Render](https://render.com).

## Stack em produção

- **Java 21** + **Spring Boot 3.2**
- **SQLite** em disco persistente (`/var/data/sgi.db`)
- **Docker** (build multi-stage no `Dockerfile`)
- **JWT** + perfil `prod`

## Arquivos de deploy

| Arquivo | Função |
|---------|--------|
| `Dockerfile` | Build Maven + runtime JRE 21; usuário não-root; `/var/data` |
| `render.yaml` | Blueprint: disco 1 GB, health check, variáveis de ambiente |
| `application-prod.properties` | Logs reduzidos, SQL desligado em produção |
| `HealthController.java` | `GET /health` para o Render |
| `ProdStartupValidator.java` | Exige `JWT_SECRET` forte em produção |
| `SqliteDataDirEnvironmentPostProcessor.java` | Cria pasta do SQLite antes da conexão |

## Variáveis de ambiente (Render)

| Variável | Valor / observação |
|----------|------------------|
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `SPRING_DATASOURCE_URL` | `jdbc:sqlite:/var/data/sgi.db` |
| `JWT_SECRET` | Gerado no painel (mín. 32 caracteres) |
| `CORS_ALLOWED_ORIGINS` | URL do frontend (ex.: Vercel) |
| `PORT` | Injetado pelo Render (não definir manualmente) |

Opcionais: `SMTP_*`, `GEMINI_API_KEY`, `CNPJ_API_*`.

## Painel Render

1. **Root Directory:** `Codigo/backend` (repositório TCC no GitHub).
2. **Disco persistente:** montar em `/var/data`.
3. **Health check path:** `/health`.
4. **Plano Free:** serviço desliga após ~15 min sem tráfego (cold start ~1 min no login).

## Frontend (Vercel)

Definir `VITE_API_URL=https://<sgi-backend>.onrender.com`.

## Repositório

- Monorepo TCC: backend em `Codigo/backend`.
- Desenvolvimento local pode usar pasta `Backend/` na raiz do clone pessoal.
