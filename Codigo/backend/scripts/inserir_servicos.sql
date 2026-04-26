-- =============================================================================
-- SCRIPT: Inserção de serviços do escritório
-- Banco: SQLite (sgi.db)
-- Vigência dos valores: a partir de 01/01/2026
-- =============================================================================

-- Inicia transação para garantir integridade (tudo ou nada)
BEGIN TRANSACTION;

-- -----------------------------------------------------------------------------
-- 1. Criação da tabela 'servicos' (se não existir)
-- Estrutura: id (auto increment), nome_servico, valor_base (decimal), observacao
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS servicos (
    id              INTEGER         PRIMARY KEY AUTOINCREMENT,
    nome_servico     VARCHAR(255)     NOT NULL,
    valor_base       REAL            NOT NULL,
    observacao       VARCHAR(500)    NULL
);

-- Índice para buscas por nome (opcional, melhora performance)
CREATE INDEX IF NOT EXISTS idx_servicos_nome ON servicos(nome_servico);

-- -----------------------------------------------------------------------------
-- 2. Inserção dos serviços e valores (vigência: 01/01/2026)
-- Valores em reais (ex.: 200.00 = R$ 200,00)
-- -----------------------------------------------------------------------------

INSERT INTO servicos (nome_servico, valor_base, observacao) VALUES
('BAIXA MEI', 200.00, NULL),
('DAS MEI', 5.00, NULL),
('DECLARAÇÃO IMPOSTO RENDA', 200.00, 'a partir de'),
('DECLARAÇÃO ITR', 150.00, NULL),
('DECLARAÇÃO DCTF', 130.00, NULL),
('DECLARAÇÃO ITCD', 450.00, 'a partir de'),
('DECLARAÇÃO MEI', 100.00, NULL),
('CADASTRO SENHA GOV', 50.00, NULL),
('CADASTRO SEGURO DESEMPREGO', 50.00, 'a partir de'),
('CADASTRO PRODUTOR RURAL', 150.00, NULL),
('CADASTRO IMÓVEL RURAL NA RECEITA/DITR E INCRA', 1000.00, NULL),
('CADASTRO MOTOSSERRAS', 150.00, NULL),
('RENOVAÇÃO MOTOSSERRAS', 80.00, NULL),
('CÁLCULO TRABALHISTA', 70.00, 'a partir de'),
('CERTIDÃO', 20.00, NULL),
('CONSULTA INTERNET', 25.00, 'a partir de'),
('CONTRATO LOCAÇÃO/ARRENDAMENTO', 120.00, NULL),
('CONTRATO DE COMPRA E VENDA', 200.00, 'a partir de'),
('DECORE', 200.00, NULL),
('eSOCIAL DOMÉSTICO', 150.00, NULL),
('ECF', 250.00, NULL),
('MICRO EMPRESA INATIVA', 70.00, NULL),
('NOTA FISCAL SERVIÇOS (ISS, PREFEITURA)', 50.00, NULL),
('NOTA FISCAL AVULSA (ESTADO)', 50.00, NULL),
('PREENCHIMENTO CADASTROS DIVERSOS', 100.00, NULL),
('PREENCHIMENTO FOLHA PAGAMENTO AVULSA', 20.00, NULL),
('PRESTAÇÃO CONTA PARTIDO', 1000.00, NULL),
('REGULARIZAÇÃO CPF', 100.00, NULL),
('XEROX', 1.00, NULL);

-- -----------------------------------------------------------------------------
-- Confirma a transação (persiste todas as alterações)
-- Em caso de erro, executar ROLLBACK; manualmente antes de nova tentativa
-- -----------------------------------------------------------------------------
COMMIT;

-- Verificação: exibe quantidade de registros inseridos
-- SELECT COUNT(*) AS total_servicos FROM servicos;
