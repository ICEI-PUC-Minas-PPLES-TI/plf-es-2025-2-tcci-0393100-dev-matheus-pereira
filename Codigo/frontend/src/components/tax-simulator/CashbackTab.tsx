import { useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api";
import { parseValorReais } from "@/lib/valorBrasil";
import { formatarMoeda } from "@/lib/taxSimulator";

type CashbackTabProps = {
  onError: (msg: string | null) => void;
};

export default function CashbackTab({ onError }: CashbackTabProps) {
  const [valorCompra, setValorCompra] = useState("");
  const [percentual, setPercentual] = useState("1");
  const [resultado, setResultado] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  async function calcular() {
    const v = parseValorReais(valorCompra);
    const pct = parseValorReais(percentual);
    if (v <= 0) {
      onError("Informe o valor da compra.");
      return;
    }
    onError(null);
    setLoading(true);
    setResultado(null);
    try {
      const res = await api.get<{ cashbackCBS?: number }>("/api/tributos/cashback", {
        params: {
          valorCompra: v,
          percentualDevolucao: !Number.isNaN(pct) && pct >= 0 && pct <= 100 ? pct / 100 : 0.01,
        },
      });
      setResultado(res.data?.cashbackCBS ?? 0);
    } catch (e: unknown) {
      onError(getApiErrorMessage(e, "Erro ao calcular cashback."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="tax-sim__card">
      <h2 className="tax-sim__card-title">Cashback CBS</h2>
      <p className="tax-sim__card-desc">Estimativa de devolução de CBS (ex.: programas de cashback).</p>
      <div className="tax-sim__fields">
        <label className="tax-sim__label">
          Valor da compra (R$)
          <input className="tax-sim__input" value={valorCompra} onChange={(e) => setValorCompra(e.target.value)} />
        </label>
        <label className="tax-sim__label">
          Percentual de devolução (%)
          <input className="tax-sim__input" value={percentual} onChange={(e) => setPercentual(e.target.value)} />
        </label>
        <button type="button" className="btn btn--primary tax-sim__btn" onClick={() => void calcular()} disabled={loading}>
          {loading ? "Calculando…" : "Calcular cashback"}
        </button>
      </div>
      {resultado != null && (
        <div className="tax-sim__result-card tax-sim__result-card--highlight tax-sim__result-card--solo">
          <span className="tax-sim__result-label">Cashback CBS estimado</span>
          <strong className="tax-sim__result-value">{formatarMoeda(resultado)}</strong>
        </div>
      )}
    </div>
  );
}
