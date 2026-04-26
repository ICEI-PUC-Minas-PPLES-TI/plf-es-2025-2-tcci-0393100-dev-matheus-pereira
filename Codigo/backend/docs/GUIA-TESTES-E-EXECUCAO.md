# Guia de Testes e Execucao - Backend SGI

## 1) Testes (primeiro passo)

Este projeto tem testes automatizados com JUnit + Spring Boot Test.

### 1.1 Rodar todos os testes

No PowerShell, dentro da pasta `Backend`:

```powershell
mvn test
```

### 1.2 Rodar compilacao + testes

```powershell
mvn clean verify
```

### 1.3 Rodar um teste especifico

```powershell
mvn -Dtest=NomeDaClasseTest test
```

Exemplo:

```powershell
mvn -Dtest=MultaJurosUtilTest test
```

### 1.4 Quando usar cada comando

- `mvn test`: validacao rapida antes de subir a API.
- `mvn clean verify`: validacao completa (ideal para entrega).
- `mvn -Dtest=... test`: depuracao de um comportamento isolado.

### 1.5 Funcionalidades cobertas pelos testes atuais

| Funcionalidade | Classe de teste |
|---|---|
| Calculo de multa, juros e valor total de dividas em atraso | `MultaJurosUtilTest` |
| Regra de vencimento padrao e comportamento de datas de vencimento | `VencimentoUtilTest` |
| Mapeamento e validacao dos status de divida | `StatusDividaTest` |
| Montagem de evento para atualizacao de status do cliente | `ClienteStatusUpdateEventTest` |
| Estrutura e dados do DTO de resumo de relatorio | `ResumoRelatorioDTOTest` |
| Excecao de regra de negocio (mensagem e propagacao) | `BusinessRuleExceptionTest` |
| Excecao de recurso nao encontrado | `ResourceNotFoundExceptionTest` |
| Excecao de recurso duplicado | `DuplicateResourceExceptionTest` |
| Listagem de usuarios ativos e revogacao de acesso (proprietaria) | `UsuarioServiceTest` |

> Observacao: os testes atuais sao majoritariamente unitarios de utilitarios, enums, DTO/evento, excecoes e regras de servico. Endpoints REST e fluxos completos podem receber cobertura adicional com testes de integracao.

---

## 2) Como rodar o sistema

## 2.1 Pre-requisitos

- Java 21
- Maven 3.8+

Verifique instalacao:

```powershell
java -version
mvn -version
```

## 2.2 Subir a API

Na pasta `Backend`:

```powershell
mvn spring-boot:run
```

API disponivel em:

- `http://localhost:8080`
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- OpenAPI JSON: `http://localhost:8080/api-docs`

## 2.3 Rodar em outra porta (se 8080 estiver ocupada)

```powershell
mvn spring-boot:run "-Dspring-boot.run.arguments=--server.port=8081"
```

---

## 3) Fluxo recomendado para desenvolvimento

1. Rodar `mvn test`.
2. Subir API com `mvn spring-boot:run`.
3. Validar endpoints no Swagger.
4. Se alterou regra critica, rodar `mvn clean verify` antes de finalizar.

---

## 4) Teste manual rapido (CNPJ e regime)

Com a API rodando, testar endpoint:

`GET /api/tributos/regime/{cnpj}`

Exemplo:

```http
GET http://localhost:8080/api/tributos/regime/07797964000151
```

Resposta esperada (exemplo):

```json
{
  "cnpj": "07797964000151",
  "nomeEmpresa": "NOME DA EMPRESA",
  "regime": "SIMPLES_NACIONAL"
}
```

Regimes retornados pelo backend:

- `MEI`
- `SIMPLES_NACIONAL`
- `NAO_OPTANTE_SIMPLES`

---

## 5) Problemas comuns

- Erro de porta: mude para `8081`.
- Erro de build: rode `mvn clean test`.
- Consulta de CNPJ falhando: backend tenta gov.br e fallback automatico; confirme conexao com internet.
