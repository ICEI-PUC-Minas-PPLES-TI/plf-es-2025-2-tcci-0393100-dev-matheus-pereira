# TCC — Sistema de Gerenciamento de Inadimplentes (SGI)

Este projeto tem como objetivo desenvolver um sistema de gerenciamento de inadimplentes para um escritório de contabilidade, visando substituir o processo manual realizado em cadernos.

A solução permite registrar clientes em atraso, acompanhar saldos devedores, registrar pagamentos manualmente, gerar relatórios financeiros, exportar dados em PDF/Excel, visualizar ranking de maiores devedores, acompanhar indicadores no dashboard, enviar e-mails de cobrança e agendar lembretes periódicos.

## 👤 Integrante da Equipe

Matheus Pereira de Carvalho Silva

## 👨‍🏫 Professores Responsáveis

- Cleiton Silva Tavares
- Danilo de Quadros Maia Filho
- Leonardo Vilela Cardoso
- Raphael Ramos Dias Costa

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React, Vite e TypeScript
- **Backend:** Java 21, Spring Boot e Maven
- **Banco de Dados:** SQLite
- **Autenticação:** JWT
- **Hospedagem:** Vercel (frontend) e Render (backend)

## 🌐 Acesso ao Sistema

O sistema pode ser acessado pela versão hospedada ou pela execução local do projeto.

- **Painel web:** configure a URL do frontend na Vercel após o deploy
- **API:** configure a URL do backend no Render após o deploy
- **Documentação da API (local):** http://localhost:8080/swagger-ui.html

## ▶️ Instruções de Replicação / Reprodução

Para executar o projeto localmente, é necessário ter instalado:

- Java 21
- Maven 3.8+
- Node.js 20 ou superior
- npm

### 1. Clonar este repositório

```bash
git clone https://github.com/ICEI-PUC-Minas-PPLES-TI/plf-es-2025-2-tcci-0393100-dev-matheus-pereira.git
cd plf-es-2025-2-tcci-0393100-dev-matheus-pereira
```

### 2. Instalar as dependências

O frontend fica na raiz do projeto e o backend na pasta `Backend/`.

**Backend:**

```bash
cd Backend
mvn clean install -DskipTests
```

**Frontend:**

```bash
cd ..
npm install
```

### 3. Configurar o banco de dados

O sistema utiliza **SQLite**. O arquivo do banco é criado automaticamente em `Backend/data/sgi.db` na primeira execução do backend.

Não é necessário instalar um servidor de banco separado. Na inicialização, o sistema cria as tabelas e os usuários iniciais.

**Usuários padrão:**

| Perfil | Login | Senha |
|--------|-------|-------|
| Responsável Financeiro | `josecarlos` | `484659` |
| Proprietária | `claudia` | `2527` |

### 4. Configurar as variáveis de ambiente

**Frontend**

Na raiz do projeto, copie o arquivo de exemplo:

```bash
cp .env.example .env
```

Exemplo de configuração:

```env
VITE_API_URL=http://localhost:8080
VITE_USE_MOCK=false
```

- `VITE_USE_MOCK=false` — usa a API real (recomendado)
- `VITE_USE_MOCK=true` — usa dados em memória, sem backend

**Backend (opcional)**

O backend funciona com as configurações padrão de `Backend/src/main/resources/application.properties`.

Para e-mail de cobrança, configure no `.env` ou nas variáveis de ambiente:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app
```

### 5. Executar a aplicação

Em um terminal, execute o **backend**:

```bash
cd Backend
mvn spring-boot:run
```

A API ficará disponível em: http://localhost:8080

Em outro terminal, execute o **frontend**:

```bash
npm run dev
```

Acesse o sistema em: http://localhost:5173

Faça login com um dos usuários padrão e utilize as funcionalidades do sistema (clientes, inadimplentes, pagamentos, relatórios e dashboard).

### 6. Executar os testes (opcional)

**Backend:**

```bash
cd Backend
mvn test
```

**Frontend:**

```bash
npm run test:run
```

## 📄 Observação

Este projeto foi desenvolvido como parte do Trabalho de Conclusão de Curso em Engenharia de Software (PUC Minas), com foco na gestão de inadimplentes de um escritório de contabilidade.

Documentação complementar: `Backend/README.md`, `docs/COMO-INTEGRAR-FRONTEND.md` e `docs/CONTRATO-API-BACKEND.md`.
