import { useState } from "react";
import { parseValorReais } from "@/lib/valorBrasil";
import { formatarMoeda, parsePercentInput, simulateNfe } from "@/lib/taxSimulator";

function maskCnpjLocal(value: string): string {
  const n = value.replace(/\D/g, "").slice(0, 14);
  if (n.length <= 2) return n;
  if (n.length <= 5) return `${n.slice(0, 2)}.${n.slice(2)}`;
  if (n.length <= 8) return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5)}`;
  if (n.length <= 12) return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(8)}`;
  return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(8, 12)}-${n.slice(12, 14)}`;
}

type NfeSimulationTabProps = {
  onError: (msg: string | null) => void;
};

export default function NfeSimulationTab({ onError }: NfeSimulationTabProps) {
  const [cnpj, setCnpj] = useState("");
  const [products, setProducts] = useState("");
  const [discount, setDiscount] = useState("");
  const [freight, setFreight] = useState("");
  const [cbsPercent, setCbsPercent] = useState("0,90");
  const [ibsPercent, setIbsPercent] = useState("0,10");
  const [cnpjInfo, setCnpjInfo] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof simulateNfe> | null>(null);

  function consultarCnpj() {
    const digits = cnpj.replace(/\D/g, "");
    if (digits.length !== 14) {
      onError("Informe um CNPJ válido com 14 dígitos.");
      return;
    }
    onError(null);
    // TODO: integrar GET /api/tributos/regime/{cnpj} quando disponível de forma estável na NF-e
    setCnpjInfo("Empresa exemplo Ltda — Regime: Não optante do Simples (consulta mockada)");
  }

  function calcular() {
    const prod = parseValorReais(products);
    if (prod <= 0) {
      onError("Informe o valor dos produtos/serviços.");
      return;
    }
    onError(null);
    setResult(
      simulateNfe({
        productsValue: prod,
        discount: parseValorReais(discount),
        freight: parseValorReais(freight),
        cbsPercent: parsePercentInput(cbsPercent),
        ibsPercent: parsePercentInput(ibsPercent),
      })
    );
  }

  return (
    <div className="tax-sim__split">
      <div className="tax-sim__panel">
        <div className="tax-sim__card">
          <h2 className="tax-sim__card-title">Simulação de NF-e</h2>
          <div className="tax-sim__fields">
            <label className="tax-sim__label">
              CNPJ
              <div className="tax-sim__inline">
                <input
                  className="tax-sim__input"
                  value={cnpj}
                  onChange={(e) => setCnpj(maskCnpjLocal(e.target.value))}
                  placeholder="00.000.000/0000-00"
                />
                <button type="button" className="btn btn--secondary" onClick={consultarCnpj}>
                  Consultar CNPJ
                </button>
              </div>
            </label>
            {cnpjInfo && <p className="tax-sim__hint">{cnpjInfo}</p>}
            <label className="tax-sim__label">
              Valor produtos/serviços (R$)
              <input className="tax-sim__input" value={products} onChange={(e) => setProducts(e.target.value)} />
            </label>
            <label className="tax-sim__label">
              Desconto (R$)
              <input className="tax-sim__input" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </label>
            <label className="tax-sim__label">
              Frete (R$)
              <input className="tax-sim__input" value={freight} onChange={(e) => setFreight(e.target.value)} />
            </label>
            <div className="tax-sim__fields-row">
              <label className="tax-sim__label">
                CBS (%)
                <input className="tax-sim__input" value={cbsPercent} onChange={(e) => setCbsPercent(e.target.value)} />
              </label>
              <label className="tax-sim__label">
                IBS (%)
                <input className="tax-sim__input" value={ibsPercent} onChange={(e) => setIbsPercent(e.target.value)} />
              </label>
            </div>
            <button type="button" className="btn btn--primary tax-sim__btn" onClick={calcular}>
              Simular nota fiscal
            </button>
          </div>
        </div>
      </div>
      <div className="tax-sim__panel tax-sim__panel--results">
        {result ? (
          <div className="tax-sim__results">
            <h3 className="tax-sim__results-title">Resumo da nota</h3>
            <div className="tax-sim__result-grid">
              {[
                { label: "Base de cálculo", value: formatarMoeda(result.baseCalculation) },
                { label: "CBS", value: formatarMoeda(result.cbs) },
                { label: "IBS", value: formatarMoeda(result.ibs) },
                { label: "Total da nota", value: formatarMoeda(result.invoiceTotal), hl: true },
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
            <p>Preencha os valores da operação para simular a NF-e.</p>
          </div>
        )}
      </div>
    </div>
  );
}
