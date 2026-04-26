/**
 * Converte string de valor em reais (formato BR ou com ponto decimal).
 * Formato BR: ponto = milhar, vírgula = decimal (ex.: 1.000,00 = 1000).
 * Sem vírgula: ponto como decimal (ex.: 150.50).
 */
export function parseValorReais(s: string): number {
  let v = s.trim().replace(/\s/g, "").replace(/[^\d.,]/g, "");
  if (!v) return 0;
  if (v.includes(",")) {
    v = v.replace(/\./g, "").replace(",", ".");
  } else {
    const dots = v.match(/\./g);
    if (dots && dots.length > 1) {
      v = v.replace(/\./g, "");
    } else if (dots && dots.length === 1) {
      const parts = v.split(".");
      if (parts[1]?.length === 3) v = v.replace(".", "");
    }
  }
  return parseFloat(v) || 0;
}

/** Formata centavos para exibição no input (ex.: 20000 → "200,00"). */
export function formatarCentavosParaInput(centavos: number | null | undefined): string {
  if (centavos == null || centavos === 0) return "";
  return (centavos / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Formata valor em reais para exibição no input (ex.: 200 → "200,00"). API retorna valores em reais. */
export function formatarReaisParaInput(valor: number | null | undefined): string {
  if (valor == null || valor === 0) return "";
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
