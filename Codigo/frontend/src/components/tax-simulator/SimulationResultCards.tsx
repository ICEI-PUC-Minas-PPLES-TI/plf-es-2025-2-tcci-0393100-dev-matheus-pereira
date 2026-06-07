import { formatarMoeda, formatarPercentual, type QuickSimulationResult } from "@/lib/taxSimulator";

type SimulationResultCardsProps = {
  result: QuickSimulationResult | null;
  emptyMessage?: string;
};

export default function SimulationResultCards({
  result,
  emptyMessage = "Preencha os campos e clique em Calcular impacto tributário para ver os resultados.",
}: SimulationResultCardsProps) {
  if (!result) {
    return (
      <div className="tax-sim__results tax-sim__results--empty">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const items = [
    { label: "Valor informado", value: formatarMoeda(result.operationValue), highlight: false },
    { label: "CBS estimada", value: formatarMoeda(result.cbsValue), highlight: false },
    { label: "IBS estimado", value: formatarMoeda(result.ibsValue), highlight: false },
    { label: "Total de tributos", value: formatarMoeda(result.totalTax), highlight: true },
    { label: "Valor líquido estimado", value: formatarMoeda(result.netValue), highlight: false },
    { label: "Preço final sugerido", value: formatarMoeda(result.finalPrice), highlight: true },
    {
      label: "Carga tributária estimada",
      value: formatarPercentual(result.taxBurdenPercent),
      highlight: false,
    },
  ];

  return (
    <div className="tax-sim__results">
      <h3 className="tax-sim__results-title">Resultado da simulação</h3>
      <div className="tax-sim__result-grid">
        {items.map((item) => (
          <div
            key={item.label}
            className={`tax-sim__result-card${item.highlight ? " tax-sim__result-card--highlight" : ""}`}
          >
            <span className="tax-sim__result-label">{item.label}</span>
            <strong className="tax-sim__result-value">{item.value}</strong>
          </div>
        ))}
      </div>
      <p className="tax-sim__result-meta">
        Alíquotas: CBS {formatarPercentual(result.cbsPercent)} · IBS {formatarPercentual(result.ibsPercent)}
      </p>
    </div>
  );
}
