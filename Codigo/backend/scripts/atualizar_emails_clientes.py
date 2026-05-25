#!/usr/bin/env python3
"""
Atualiza o campo email da tabela cliente a partir de clientes-emails.csv.
Uso: python scripts/atualizar_emails_clientes.py [caminho-do-sgi.db]
"""
from __future__ import annotations

import csv
import re
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = ROOT / "data" / "sgi.db"
DEFAULT_CSV = ROOT / "src" / "main" / "resources" / "data" / "clientes-emails.csv"

# Nome na planilha -> fragmento único do nome no cadastro (clientes-importar / banco)
MAPEAMENTO: dict[str, str | None] = {
    "AC FORCECIMENTO": "AC FORNECIMENTOS",
    "AFONSO PEREIRA": None,
    "AGUINALDO LOPES": None,
    "ALEXANDRE ROD.": "WANDERSON ALEX RODRIGUES",
    "ANA DIANNA": "GABRIELLA THOMAZ LAGES DIANA",
    "ARTHUR ABREU": "ARTHUR SANTA BARBARA DE ABREU",
    "BBR ENGENHARIA E CONSTRUCAO LTDA": "BBR ENGENHARIA E CONSTRUCAO",
    "BJ-RESTAURANTE- COMERCIO & SERVICOS LTDA": "BJ-RESTAURANTE",
    "BRUNA BEATRIZ": None,
    "CAROLINA RAMOS": None,
    "CENTRO EDUCACIONAL MAMAE CORUJA LTDA": "CENTRO EDUCACIONAL MAMAE CORUJA",
    "CG7 BUSINESS": "CG7 BUSINESS SOLUTIONS",
    "COMERCIAL JPC": "COMERCIAL JPC",
    "COMERCIAL SA": "COMERCIAL SA E OLIVEIRA",
    "COOPERATIVA": "COOP AGROP",
    "D/MAX EMP.": "D/MAX-CONSTRUCOES",
    "DUVAL PIRES": "DUVAL DE FIGUEIREDO PIRES",
    "EDUARDO BOAVENTURA LIMA FILHO E CIA LTDA": "EDUARDO BOAVENTURA LIMA FILHO",
    "ERNANDO JOSE": "ERNANDO JOSE DE MATOS",
    "FABYANO SILVA": "FABYANO SILVA DE OLIVEIRA",
    "FERNANDO SANTOS": "FERNANDO SANTOS DA SILVA",
    "GINO LUIZ": "GINO LUIS COSTA",
    "HABITATECH ENG.": "HABITATECH ENGENHARIA",
    "HOTELZINHO TIA PRI LTDA": "HOTELZINHO TIA PRI",
    "HUMBERTO J.": "HUMBERTO JOSE DA SILVA GALVAO",
    "IDEAL VISUAL": "IDEAL COMUNICACAO VISUAL",
    "JACKELINE C.": "JACKELINE PEREIRA CIRINO SIMOES",
    "JOSE RONALDO PIRES": "JOSE RONALDO PIRES PIMENTA",
    "KLAM CONST.": None,
    "LEANDRO CAMILO": "LEANDRO CAMILO CARVALHO",
    "LETICIA APARECIDA ASSUNCAO - ME": "LETICIA APARECIDA ASSUNCAO",
    "LIGIA LIMA": "LIGIA LIMA RELOJOARIA",
    "MAIRA FERNANDA LIMA BRANCO": None,
    "MARIA DA GRACA": "MARIA DA GRACA CARNEIRO FERREIRA",
    "MERCEARIA ITACOLOMI LTDA": "MERCEARIA ITACOLOMI",
    "PIMENTA PORTILHO": "PIMENTA PORTILHO FISIOTERAPIA",
    "POR DO SOL CMD LTDA ME": "POR DO SOL CMD",
    "POUSADA E RESTAURANTE KAYUA LTDA": "POUSADA E RESTAURANTE KAYUA",
    "POUSADA ESTRADA VELHA LTDA": "POUSADA ESTRADA VELHA",
    "POUSADA OURO DO VINTEM LTDA": None,
    "QUARTO MASCARENHAS COM E LOC VEICULOS LTDA": "QUARTO MASCARENHAS",
    "RENATA KELEM": None,
    "RESTAURANTE MONTE CASTELO LTDA": "RESTAURANTE MONTE CASTELO",
    "RFIT- SERVICOS & COMERCIO LTDA": "RFIT- SERVICOS",
    "RG LOCAÇÕES": None,
    "RLC AGROPECUARIA": "RLC AGROPECUARIA",
    "RUI AIRES PINTO TRANSPORTES LTDA": "RUI AIRES PINTO TRANSPORTES",
    "SANDEY ROGERIO": "SANDEY ROGERIO APARECIDO",
    "SIMONE CAETANO": None,
    "SOLARIO": "SOLARIO BOUTIQUE",
    "SORRIA CLINICA": "SORRIA-CLINICA DENTARIA",
    "THAIS SIMOES": "THAIS SIMOES SOCIEDADE",
    "THIAGO LEAO": "THIAGO DE ALMEIDA LEAO",
    "TRANSPORTE ESCOLAR SOUZA OTONI LTDA -ME": "TRANSPORTE ESCOLAR SOUZA OTONI",
    "WANDER ROSA": "WANDER ROSA DE SANTANA",
}

EMAIL_RE = re.compile(r"^[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}$")


def normalizar_email(raw: str) -> str | None:
    if not raw or not raw.strip():
        return None
    email = raw.strip().split("/")[0].strip()
    email = email.replace("autlook.com", "outlook.com")
    if not EMAIL_RE.match(email):
        print(f"  [AVISO] E-mail inválido ignorado: {email}")
        return None
    return email


def carregar_csv(path: Path) -> list[tuple[str, str]]:
    rows: list[tuple[str, str]] = []
    with path.open(encoding="utf-8-sig", newline="") as f:
        for line in f:
            line = line.strip()
            if not line or line.upper().startswith("NOME DA EMPRESA"):
                continue
            parts = line.split(";", 1)
            if len(parts) < 2:
                continue
            nome, email = parts[0].strip(), parts[1].strip()
            email_norm = normalizar_email(email)
            if email_norm:
                rows.append((nome, email_norm))
    return rows


def buscar_cliente(nome_planilha: str, clientes: list[tuple]) -> tuple | None:
    fragmento = MAPEAMENTO.get(nome_planilha)
    if fragmento is None:
        return None
    matches = [c for c in clientes if fragmento.upper() in c[1].upper()]
    if len(matches) == 1:
        return matches[0]
    if len(matches) > 1:
        print(f"  [AVISO] Vários clientes para '{nome_planilha}': {[m[1] for m in matches]}")
        return matches[0]
    return None


def main() -> int:
    db_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_DB
    csv_path = DEFAULT_CSV

    if not db_path.exists():
        print(f"Banco não encontrado: {db_path}")
        return 1
    if not csv_path.exists():
        print(f"CSV não encontrado: {csv_path}")
        return 1

    linhas = carregar_csv(csv_path)
    conn = sqlite3.connect(db_path, timeout=30)
    cur = conn.cursor()
    cur.execute("SELECT cliente_id, nome, cpf_cnpj, email FROM cliente")
    clientes = cur.fetchall()

    atualizados = 0
    nao_encontrados: list[str] = []
    sem_mapeamento: list[str] = []
    agora = datetime.now().isoformat(sep=" ", timespec="seconds")

    for nome_planilha, email in linhas:
        if nome_planilha not in MAPEAMENTO:
            sem_mapeamento.append(nome_planilha)
            continue
        if MAPEAMENTO[nome_planilha] is None:
            nao_encontrados.append(nome_planilha)
            continue
        cliente = buscar_cliente(nome_planilha, clientes)
        if not cliente:
            nao_encontrados.append(nome_planilha)
            continue
        cliente_id, nome_db, _, email_atual = cliente
        if email_atual and email_atual.strip().lower() == email.lower():
            print(f"[OK] {nome_db}: e-mail já cadastrado")
            continue
        cur.execute(
            "UPDATE cliente SET email = ?, atualizado_em = ? WHERE cliente_id = ?",
            (email, agora, cliente_id),
        )
        atualizados += 1
        print(f"[+] {nome_db} <- {email}")

    conn.commit()
    conn.close()

    print()
    print(f"Atualizados: {atualizados}")
    if nao_encontrados:
        print("Sem cliente no banco (cadastre antes ou ajuste o mapeamento):")
        for n in nao_encontrados:
            print(f"  - {n}")
    if sem_mapeamento:
        print("Sem entrada no mapeamento:")
        for n in sem_mapeamento:
            print(f"  - {n}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
