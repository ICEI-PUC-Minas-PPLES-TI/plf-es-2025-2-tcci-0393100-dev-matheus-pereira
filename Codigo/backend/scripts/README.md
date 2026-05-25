# Scripts do projeto SGI

## Inserir serviços (`inserir_servicos.sql`)

Script SQL que cria a tabela `servicos` (se não existir) e insere a lista de serviços com valores vigentes a partir de 01/01/2026.

### Como executar (SQLite)

Na raiz do projeto, com o arquivo do banco em `data/sgi.db`:

```bash
sqlite3 data/sgi.db < scripts/inserir_servicos.sql
```

Ou abrindo o SQLite interativo:

```bash
sqlite3 data/sgi.db
sqlite> .read scripts/inserir_servicos.sql
sqlite> SELECT COUNT(*) FROM servicos;
```

### Observação

A **aplicação Spring Boot** utiliza a tabela **`servico`** (singular), com estrutura diferente (UUID, nome, descricao, valor_padrao, ativo). A tabela **`servicos`** criada por este script é independente e segue o layout solicitado (id auto increment, nome_servico, valor_base, observacao).

Se for necessário alimentar o catálogo usado pela API (`GET /api/servicos`), é preciso migrar os dados de `servicos` para `servico` ou importar via API/DataSeeder.

## Atualizar e-mails de clientes (`atualizar_emails_clientes.py`)

Lê `src/main/resources/data/clientes-emails.csv` (formato `NOME;E-MAIL`) e grava o campo `email` na tabela `cliente`, casando pelo nome cadastrado.

```bash
# Pare o backend se o SQLite estiver bloqueado; depois:
python scripts/atualizar_emails_clientes.py
```

Empresas da planilha que ainda não existem no cadastro são listadas no final do script para cadastro manual.
