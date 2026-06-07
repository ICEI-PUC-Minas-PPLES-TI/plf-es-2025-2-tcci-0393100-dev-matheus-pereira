import { useState } from "react";
import { api } from "@/lib/api";
import { parseValorReais } from "@/lib/valorBrasil";
import {
  formatarMoeda,
  parsePercentInput,
  profileToApiCategory,
  simulateTaxCredit,
} from "@/lib/taxSimulator";

type TaxCreditTabProps = {
  onError: (msg: string | null) => void;
};

export default function TaxCreditTab({ onError }: TaxCreditTabProps) {
  const [sales, setSales] = useState("");
  const [purchases, setPurchases] = useState("");
  const [cbsSales, setCbsSales] = useState("0,90");
  const [ibsSales, setIbsSales] = useState("0,10");
  const [cbsCredit, setCbsCredit] = useState("0,90");
  const [ibsCredit, setIbsCredit] = useState("0,10");
  const [result, setResult] = useState<ReturnType<typeof simulateTaxCredit> | null>(null);
  const [loading, setLoading] = useState(false);

  async function calcular() {
    const vSales = parseValorReais(sales);
    const vPurchases = parseValorReais(purchases);
    if (vSales <= 0) {
      onError("Informe o valor total das vendas.");
      return;
    }
    onError(null);
    setLoading(true);

    const input = {
      salesTotal: vSales,
      cbsSalesPercent: parsePercentInput(cbsSales),
      ibsSalesPercent: parsePercentInput(ibsSales),
      purchasesTotal: vPurchases,
      cbsCreditPercent: parsePercentInput(cbsCredit),
      ibsCreditPercent: parsePercentInput(ibsCredit),
    };
    const local = simulateTaxCredit(input);

    try {
      await api.post("/api/tributos/creditos/validar", {
        valorVenda: vSales,
        valorCompras: vPurchases,
        categoria: profileToApiCategory("PADRAO"),
      });
    } catch {
      /* mantém simulação local */
    }

    setResult(local);
    setLoading(false);
  }

  const rows = result
    ? [
        ["Débito CBS (vendas)", formatarMoeda(result.cbsDebit)],
        ["Débito IBS (vendas)", formatarMoeda(result.ibsDebit)],
        ["Crédito CBS (compras)", formatarMoeda(result.cbsCredit)],
        ["Crédito IBS (compras)", formatarMoeda(result.ibsCredit)],
        ["CBS a recolher", formatarMoeda(result.cbsToPay)],
        ["IBS a recolher", formatarMoeda(result.ibsToPay)],
        ["Total a recolher", formatarMoeda(result.totalToPay)],
      ]
    : [];

  return (
    <div className="tax-sim__card">
      <h2 className="tax-sim__card-title">Crédito tributário</h2>
      <p className="tax-sim__card-desc">Simule débitos sobre vendas e créditos sobre compras (não cumulatividade).</p>
      <div className="tax-sim__fields tax-sim__fields--grid">
        <label className="tax-sim__label">
          Valor total das vendas (R$)
          <input className="tax-sim__input" value={sales} onChange={(e) => setSales(e.target.value)} />
        </label>
        <label className="tax-sim__label">
          Valor total das compras (R$)
          <input className="tax-sim__input" value={purchases} onChange={(e) => setPurchases(e.target.value)} />
        </label>
        <label className="tax-sim__label">
          CBS sobre vendas (%)
          <input className="tax-sim__input" value={cbsSales} onChange={(e) => setCbsSales(e.target.value)} />
        </label>
        <label className="tax-sim__label">
          IBS sobre vendas (%)
          <input className="tax-sim__input" value={ibsSales} onChange={(e) => setIbsSales(e.target.value)} />
        </label>
        <label className="tax-sim__label">
          Crédito CBS (%)
          <input className="tax-sim__input" value={cbsCredit} onChange={(e) => setCbsCredit(e.target.value)} />
        </label>
        <label className="tax-sim__label">
          Crédito IBS (%)
          <input className="tax-sim__input" value={ibsCredit} onChange={(e) => setIbsCredit(e.target.value)} />
        </label>
      </div>
      <button type="button" className="btn btn--primary tax-sim__btn" onClick={() => void calcular()} disabled={loading}>
        {loading ? "Calculando…" : "Calcular crédito tributário"}
      </button>

      {result && (
        <div className="tax-sim__table-wrap">
          <table className="tax-sim__table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([desc, val]) => (
                <tr key={desc}>
                  <td>{desc}</td>
                  <td className="tax-sim__num">{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
