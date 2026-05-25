/** Escapa valor para CSV (separador `;`, compatível com Excel no Brasil). */
export function escapeCsvCell(value: string): string {
  const v = value ?? "";
  if (/[;"\r\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

/** Gera CSV com BOM e faz download (abre no Excel com encoding UTF-8). */
export function exportarCSV(nome: string, cabecalhos: string[], linhas: string[][]) {
  const sep = ";";
  const BOM = "\uFEFF";
  const row = (cells: string[]) => cells.map(escapeCsvCell).join(sep);
  const csv = BOM + [row(cabecalhos), ...linhas.map(row)].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nome}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
