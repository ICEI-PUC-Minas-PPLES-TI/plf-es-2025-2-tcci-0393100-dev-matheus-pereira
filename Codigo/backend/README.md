# SGI - Sistema de Gerenciamento de Inadimplentes

Backend REST API do Sistema de Gerenciamento de Inadimplentes para escritório de contabilidade. TCC Engenharia de Software - PUC Minas.

## Stack

- **Java 21**
- **Spring Boot 3.2**
- **SQLite** (arquivo `./data/sgi.db`)
- **JPA/Hibernate**
- **Spring Security + JWT**
- **Spring Mail (SMTP)**
- **SpringDoc OpenAPI (Swagger)**
- **Maven**

## Pré-requisitos

- JDK 21
- Maven 3.8+

## Execução

```bash
# Criar diretório do banco (opcional; a aplicação cria se não existir)
mkdir -p data

# Executar
mvn spring-boot:run
```

A API estará em **http://localhost:8080**.

## Documentação da API (Swagger)

- **Swagger UI:** http://localhost:8080/swagger-ui.html
- **OpenAPI JSON:** http://localhost:8080/api-docs

## Autenticação

Todos os endpoints (exceto `POST /api/auth/login`) exigem o header:

```
Authorization: Bearer <token>
```

### Login

**POST** `/api/auth/login`

```json
{
  "telefone": "31999999999",
  "senha": "admin123"
}
```

Resposta:

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "perfil": "RESPONSAVEL_FINANCEIRO",
  "nome": "Responsável Financeiro",
  "telefone": "31999999999"
}
```

## Dados iniciais (seed)

Na primeira execução são criados:

| Recurso        | Dados |
|----------------|-------|
| Usuários       | `31999999999` / `admin123` (RESPONSAVEL_FINANCEIRO), `31988888888` / `prop123` (PROPRIETARIA) |
| Clientes       | 3 clientes (1 adimplente, 2 inadimplentes) |
| Dívidas        | 5 dívidas de exemplo |
| Pagamentos     | 3 pagamentos de exemplo |
| Config. email  | 1 configuração SMTP inativa |

## Valores monetários

Todos os valores monetários na API estão em **centavos** (ex.: R$ 100,00 = `10000`).

## Principais endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST   | /api/auth/login | Login (telefone + senha) |
| GET    | /api/auth/me | Dados do usuário autenticado |
| GET    | /api/clientes | Listar clientes (filtros, paginação) |
| POST   | /api/clientes | Cadastrar cliente |
| GET    | /api/clientes/ranking-devedores | Top 10 maiores devedores |
| GET    | /api/dividas | Listar dívidas |
| POST   | /api/dividas | Registrar dívida |
| POST   | /api/pagamentos | Registrar pagamento |
| GET    | /api/relatorios/inadimplentes | Relatório inadimplentes |
| GET    | /api/relatorios/exportar/{pdf\|excel} | Exportar relatório |
| POST   | /api/notificacoes/enviar-cobranca | Enviar email de cobrança |
| GET    | /api/agendamentos | Listar agendamentos de lembretes |
| POST   | /api/email-config | Configurar SMTP |

## Configuração (application.properties)

- **Banco:** `spring.datasource.url=jdbc:sqlite:./data/sgi.db`
- **JWT:** `jwt.secret` (mín. 256 bits), `jwt.expiration` (ms)
- **CORS:** `cors.allowed-origins` (ex.: `http://localhost:5173,http://localhost:3000`)
- **Scheduler:** `scheduler.enabled`, `scheduler.dividas-vencidas.cron`, `scheduler.agendamentos.cron`

Variáveis de ambiente opcionais: `JWT_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `GEMINI_API_KEY` (para consulta IA da página de Reforma Tributária; ver `docs/RELATORIO-FRONTEND-REFORMA-TRIBUTARIA.md`).

## Licença

Projeto acadêmico - PUC Minas.
