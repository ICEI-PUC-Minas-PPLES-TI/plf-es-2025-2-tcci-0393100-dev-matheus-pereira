export function escapeHtml(s: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return String(s).replace(/[&<>"']/g, (c) => map[c] ?? c);
}

export type ServicoRelatorio = { titulo: string; valorPadrao?: number | null };

/**
 * Gera o HTML da tabela do relatório "Valores a serem cobrados por serviços prestados".
 */
export function gerarHtmlRelatorioServicos(servicos: ServicoRelatorio[]): string {
  const linhas = servicos.map((s) => {
    const nome = escapeHtml(s.titulo);
    const valor =
      s.valorPadrao != null && s.valorPadrao > 0
        ? s.valorPadrao.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : "—";
    return `<tr><td class="nome">${nome}</td><td class="traco"></td><td class="valor">${escapeHtml(valor)}</td></tr>`;
  });
  return `<table class="relatorio-servicos__tabela"><tbody>${linhas.join("")}</tbody></table>`;
}
