import { exportarCSV } from "@/lib/exportarCsv";
import type { Cliente } from "@/types/api";

export type FiltrosRelatorioClientes = {
  busca?: string;
  situacao?: "todos" | "ativo" | "inativo";
};

function formatCpfExport(cpf: string | undefined): string {
  if (!cpf?.trim()) return "";
  const n = cpf.replace(/\D/g, "");
  if (n.length === 11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (n.length === 14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return cpf;
}

function formatTelefoneFixoExport(tel: string | undefined): string {
  if (!tel?.trim()) return "";
  const n = tel.replace(/\D/g, "");
  const local = n.length > 8 ? n.slice(-8) : n;
  if (local.length >= 5) return `${local.slice(0, 4)}-${local.slice(4)}`;
  return local || tel;
}

function formatCelularExport(tel: string | undefined): string {
  if (!tel?.trim()) return "";
  const n = tel.replace(/\D/g, "").slice(0, 11);
  if (n.length <= 2) return n ? `(${n}` : tel;
  if (n.length <= 7) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
}

/**
 * Exporta listagem de clientes em CSV (Excel).
 * Usa a lista já filtrada/ordenada exibida na tela.
 */
export function exportarRelatorioClientesExcel(
  clientes: Cliente[],
  filtros?: FiltrosRelatorioClientes
): void {
  const cabecalhos = [
    "Nome",
    "CPF/CNPJ",
    "Telefone fixo",
    "Celular",
    "E-mail",
    "Endereço",
    "Situação",
  ];

  const linhas = clientes.map((c) => [
    c.nome,
    formatCpfExport(c.cpf),
    formatTelefoneFixoExport(c.telefone),
    formatCelularExport(c.celular),
    c.email?.trim() ?? "",
    c.endereco?.trim() ?? "",
    c.situacao ?? "Ativo",
  ]);

  const data = new Date().toISOString().slice(0, 10);
  const sufixoFiltro = filtros?.situacao && filtros.situacao !== "todos" ? `-${filtros.situacao}` : "";
  const nomeArquivo = `clientes${sufixoFiltro}-${data}`;

  exportarCSV(nomeArquivo, cabecalhos, linhas);
}
