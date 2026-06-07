import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  AgingRelatorio,
  EfetividadeCobrancaRelatorio,
  ExtratoCliente,
  InadimplenciaPeriodoRelatorio,
  RankingDevedorItem,
  ResumoFinanceiro,
} from "@/types/api";

export type RelatorioAbaId =
  | "ranking"
  | "extrato"
  | "inadimplencia"
  | "pagamentos"
  | "aging"
  | "efetividade";

export type DadosRelatorioPdf = {
  aba: RelatorioAbaId;
  ranking?: RankingDevedorItem[];
  filtroPeriodo?: string;
  filtroLimit?: number;
  inadPeriodo?: InadimplenciaPeriodoRelatorio | null;
  dataInicio?: string;
  dataFim?: string;
  pagamentos?: ResumoFinanceiro | null;
  dataInicioPag?: string;
  dataFimPag?: string;
  aging?: AgingRelatorio | null;
  efetividade?: EfetividadeCobrancaRelatorio | null;
  mesEfetividade?: string;
  extrato?: ExtratoCliente | null;
};

const TITULOS: Record<RelatorioAbaId, string> = {
  ranking: "Ranking de Maiores Devedores",
  extrato: "Extrato por Cliente",
  inadimplencia: "Inadimplência por Período",
  pagamentos: "Pagamentos Recebidos",
  aging: "Análise de Aging",
  efetividade: "Efetividade de Cobrança",
};

function formatarData(s: string) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatarMoeda(n: number | null | undefined) {
  const valor = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarPercentual(n: number | null | undefined, casas = 1) {
  const valor = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return `${valor.toFixed(casas)}%`;
}

function dataEmissao() {
  return new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function labelPeriodoRanking(filtro?: string) {
  if (filtro === "mes") return "Último mês";
  if (filtro === "semana") return "Última semana";
  if (filtro === "trimestre") return "Trimestre";
  if (filtro === "ano") return "Ano";
  return "Período personalizado";
}

function criarDocumento(titulo: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margem = 14;
  let y = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(26, 26, 26);
  doc.text(titulo, margem, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text("Gestão de Inadimplentes", margem, y);
  y += 5;
  doc.text(`Emitido em: ${dataEmissao()}`, margem, y);
  y += 6;

  doc.setDrawColor(164, 63, 155);
  doc.setLineWidth(0.6);
  doc.line(margem, y, 196, y);
  y += 8;

  return { doc, margem, y };
}

function texto(doc: jsPDF, linhas: string[], startY: number, margem = 14) {
  let y = startY;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(55, 65, 81);
  for (const linha of linhas) {
    const quebradas = doc.splitTextToSize(linha, 182);
    doc.text(quebradas, margem, y);
    y += quebradas.length * 5 + 2;
  }
  return y + 4;
}

function rodape(doc: jsPDF) {
  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text("Documento gerado pelo sistema. Confidencial.", 14, 287);
    doc.text(`Página ${i} de ${paginas}`, 196, 287, { align: "right" });
  }
}

function nomeArquivo(aba: RelatorioAbaId) {
  const data = new Date().toISOString().slice(0, 10);
  return `relatorio-${aba}-${data}.pdf`;
}

function temDados(d: DadosRelatorioPdf): boolean {
  switch (d.aba) {
    case "ranking":
      return (d.ranking?.length ?? 0) > 0;
    case "extrato":
      return !!d.extrato;
    case "inadimplencia":
      return !!d.inadPeriodo;
    case "pagamentos":
      return !!d.pagamentos;
    case "aging":
      return !!d.aging?.faixas?.length;
    case "efetividade":
      return !!d.efetividade;
    default:
      return false;
  }
}

/** Gera e baixa PDF apenas com os dados do relatório (sem captura da tela). */
export function exportarRelatorioPdf(d: DadosRelatorioPdf): void {
  if (!temDados(d)) {
    throw new Error("Não há dados para gerar o PDF. Carregue o relatório e tente novamente.");
  }

  const titulo = TITULOS[d.aba];
  const { doc, margem, y: yInicial } = criarDocumento(titulo);
  let y = yInicial;

  if (d.aba === "ranking" && d.ranking?.length) {
    y = texto(doc, [
      `Período: ${labelPeriodoRanking(d.filtroPeriodo)} | Limite: Top ${d.filtroLimit ?? 20}`,
    ], y, margem);

    autoTable(doc, {
      startY: y,
      margin: { left: margem, right: margem },
      head: [["Pos.", "Cliente", "CPF/CNPJ", "Valor devido", "Qtd.", "Atraso médio", "Status"]],
      body: d.ranking.map((r) => [
        String(r.posicao),
        r.clienteNome,
        r.cpfCnpj,
        formatarMoeda(r.valorDevido),
        String(r.qtdDividas),
        `${r.mediaDiasAtraso} dias`,
        r.status,
      ]),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [164, 63, 155], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        0: { halign: "center", cellWidth: 12 },
        3: { halign: "right" },
        4: { halign: "center", cellWidth: 14 },
        5: { halign: "center", cellWidth: 22 },
      },
    });
  }

  if (d.aba === "inadimplencia" && d.inadPeriodo) {
    const p = d.inadPeriodo;
    y = texto(
      doc,
      [
        `Período: ${formatarData(p.dataInicio)} a ${formatarData(p.dataFim)}`,
        `Total de clientes: ${p.totalClientes} | Valor total: ${formatarMoeda(p.valorTotal)}`,
        `Dívidas vencidas no período: ${p.dividasVencidasNoPeriodo} (${formatarMoeda(p.valorVencidoNoPeriodo)})`,
      ],
      y,
      margem
    );

    autoTable(doc, {
      startY: y,
      margin: { left: margem, right: margem },
      head: [["Cliente", "CPF/CNPJ", "Qtd. dívidas", "Valor total", "Status pior"]],
      body: p.detalhamento.map((r) => [
        r.clienteNome,
        r.cpfCnpj,
        String(r.qtdDividas),
        formatarMoeda(r.valorTotal),
        r.statusPior,
      ]),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [164, 63, 155], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: { 2: { halign: "center" }, 3: { halign: "right" } },
    });
  }

  if (d.aba === "pagamentos" && d.pagamentos) {
    const pag = d.pagamentos;
    const inicio = pag.periodoInicio ?? d.dataInicioPag ?? "";
    const fim = pag.periodoFim ?? d.dataFimPag ?? "";
    texto(
      doc,
      [
        `Período: ${formatarData(inicio)} a ${formatarData(fim)}`,
        `Valor total recebido: ${formatarMoeda(pag.totalRecebido)}`,
      ],
      y,
      margem
    );
  }

  if (d.aba === "aging" && d.aging) {
    const a = d.aging;
    autoTable(doc, {
      startY: y,
      margin: { left: margem, right: margem },
      head: [["Faixa", "Qtd. dívidas", "Valor total", "% do total"]],
      body: a.faixas.map((f) => [
        f.faixa,
        String(f.qtdDividas),
        formatarMoeda(f.valorTotal),
        formatarPercentual(f.percentual),
      ]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [164, 63, 155], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: { 1: { halign: "center" }, 2: { halign: "right" }, 3: { halign: "right" } },
    });

    const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
    texto(doc, [`Valor total geral: ${formatarMoeda(a.valorTotalGeral)}`], finalY + 8, margem);
  }

  if (d.aba === "efetividade" && d.efetividade) {
    const e = d.efetividade;
    const linhas = [
      `Período: ${e.periodo}`,
      `Notificações enviadas: ${e.totalNotificacoes}`,
      `E-mails entregues: ${e.emailsEntregues} (${formatarPercentual(e.taxaEntrega)})`,
      `Falhas: ${e.falhas}`,
      `Cobranças com pagamento: ${e.cobrancasComPagamento} (${e.taxaConversao}%)`,
      `Tempo médio até pagamento: ${e.tempoMedioDias} dias`,
    ];
    if (e.comparativoAnterior) {
      linhas.push(
        `Comparativo: ${e.comparativoAnterior.periodo} ${e.comparativoAnterior.taxaConversao}% → este mês ${e.taxaConversao}% (${e.comparativoAnterior.variacaoPp >= 0 ? "+" : ""}${e.comparativoAnterior.variacaoPp} pp)`
      );
    }
    texto(doc, linhas, y, margem);
  }

  if (d.aba === "extrato" && d.extrato) {
    const ex = d.extrato;
    y = texto(
      doc,
      [
        `Nome: ${ex.cliente.nome}`,
        `CPF/CNPJ: ${ex.cliente.cpfCnpj}`,
        `Status: ${ex.cliente.status}`,
        `Saldo devedor total: ${formatarMoeda(ex.cliente.saldoDevedorTotal)}`,
      ],
      y,
      margem
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(55, 65, 81);
    doc.text("Dívidas ativas", margem, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      margin: { left: margem, right: margem },
      head: [["Protocolo", "Descrição", "Vencimento", "Valor devido", "Status", "Dias atraso"]],
      body:
        ex.dividasAtivas.length > 0
          ? ex.dividasAtivas.map((r) => [
              r.protocolo,
              r.descricao,
              formatarData(r.vencimento),
              formatarMoeda(r.valorDevido),
              r.status,
              String(r.diasAtraso),
            ])
          : [["—", "Nenhuma dívida ativa", "—", "—", "—", "—"]],
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [164, 63, 155], textColor: 255, fontStyle: "bold" },
      columnStyles: { 3: { halign: "right" }, 5: { halign: "center" } },
    });

    let y2 = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
    y2 += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Histórico de pagamentos", margem, y2);
    y2 += 6;

    autoTable(doc, {
      startY: y2,
      margin: { left: margem, right: margem },
      head: [["Data", "Protocolo", "Valor pago", "Método"]],
      body:
        ex.historicoPagamentos.length > 0
          ? ex.historicoPagamentos.map((p) => [
              formatarData(p.data),
              p.protocolo,
              formatarMoeda(p.valorPago),
              p.metodo,
            ])
          : [["—", "Nenhum pagamento registrado", "—", "—"]],
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [164, 63, 155], textColor: 255, fontStyle: "bold" },
      columnStyles: { 2: { halign: "right" } },
    });
  }

  rodape(doc);
  doc.save(nomeArquivo(d.aba));
}
