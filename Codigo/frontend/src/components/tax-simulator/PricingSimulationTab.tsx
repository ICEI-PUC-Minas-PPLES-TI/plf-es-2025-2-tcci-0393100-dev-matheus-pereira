import { useState } from "react";
import { api } from "@/lib/api";
import { parseValorReais } from "@/lib/valorBrasil";
import {
  formatarMoeda,
  formatarPercentual,
  parsePercentInput,
  profileToApiCategory,
  simulatePricing,
} from "@/lib/taxSimulator";
import TaxAlert from "./TaxAlert";

type PricingSimulationTabProps = {
  onError: (msg: string | null) => void;
};

export default function PricingSimulationTab({ onError }: PricingSimulationTabProps) {
  const [cost, setCost] = useState("");
  const [expenses, setExpenses] = useState("");
  const [margin, setMargin] = useState("20");
  const [taxPercent, setTaxPercent] = useState("26,70");
  const [result, setResult] = useState<ReturnType<typeof simulatePricing>>(null);
  const [loading, setLoading] = useState(false);

  async function calcular() {
    const custo = parseValorReais(cost);
    const despesas = parseValorReais(expenses);
    const margem = parsePercentInput(margin);
    const aliq = parsePercentInput(taxPercent);
    if (custo <= 0) {
      onError("Informe o custo do produto ou serviço.");
      return;
    }
    onError(null);
    setLoading(true);

    const local = simulatePricing({
      cost: custo,
      extraExpenses: despesas,
      marginPercent: margem,
      totalTaxPercent: aliq,
    });

    try {
      const res = await api.post<{ precoVenda?: number; valorFinal?: number }>("/api/tributos/calcular", {
        tipo: "MARGEM_LUCRO",
        valor: 0,
        categoria: profileToApiCategory("PADRAO"),
        custoAquisicao: custo + despesas,
        margemDesejada: margem / 100,
      });
      const apiPrice = res.data.precoVenda ?? res.data.valorFinal;
      if (local && apiPrice != null && apiPrice > 0) {
        const estimatedTaxes = apiPrice * (aliq / 100);
        const estimatedProfit = apiPrice - custo - despesas - estimatedTaxes;
        setResult({
          suggestedMinPrice: apiPrice,
          estimatedProfit,
          estimatedTaxes,
          netMarginPercent: apiPrice > 0 ? (estimatedProfit / apiPrice) * 100 : 0,
          costBase: custo + despesas,
        });
      } else {
        setResult(local);
      }
    } catch {
      setResult(local);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="tax-sim__split">
      <div className="tax-sim__panel tax-sim__panel--form">
        <div className="tax-sim__card">
          <h2 className="tax-sim__card-title">Formação de preço</h2>
          <p className="tax-sim__card-desc">Estime preço mínimo, tributos e margem líquida após impostos.</p>
          <div className="tax-sim__fields">
            <label className="tax-sim__label">
              Custo do produto/serviço (R$)
              <input className="tax-sim__input" value={cost} onChange={(e) => setCost(e.target.value)} />
            </label>
            <label className="tax-sim__label">
              Despesas adicionais (R$)
              <input className="tax-sim__input" value={expenses} onChange={(e) => setExpenses(e.target.value)} />
            </label>
            <label className="tax-sim__label">
              Margem desejada (%)
              <input className="tax-sim__input" value={margin} onChange={(e) => setMargin(e.target.value)} />
            </label>
            <label className="tax-sim__label">
              Alíquota total estimada (%)
              <input className="tax-sim__input" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} />
            </label>
            <button type="button" className="btn btn--primary tax-sim__btn" onClick={() => void calcular()} disabled={loading}>
              {loading ? "Calculando…" : "Calcular formação de preço"}
            </button>
          </div>
        </div>
        <TaxAlert>Valores estimados para apoio à decisão comercial. Valide com seu contador.</TaxAlert>
      </div>
      <div className="tax-sim__panel tax-sim__panel--results">
        {result ? (
          <div className="tax-sim__results">
            <h3 className="tax-sim__results-title">Resultado</h3>
            <div className="tax-sim__result-grid">
              {[
                { label: "Preço mínimo sugerido", value: formatarMoeda(result.suggestedMinPrice), hl: true },
                { label: "Lucro estimado", value: formatarMoeda(result.estimatedProfit), hl: false },
                { label: "Tributos estimados", value: formatarMoeda(result.estimatedTaxes), hl: false },
                { label: "Margem líquida após tributos", value: formatarPercentual(result.netMarginPercent), hl: true },
              ].map((i) => (
                <div key={i.label} className={`tax-sim__result-card${i.hl ? " tax-sim__result-card--highlight" : ""}`}>
                  <span className="tax-sim__result-label">{i.label}</span>
                  <strong className="tax-sim__result-value">{i.value}</strong>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="tax-sim__results tax-sim__results--empty">
            <p>Informe custos e margem para simular a formação de preço.</p>
          </div>
        )}
      </div>
    </div>
  );
}
