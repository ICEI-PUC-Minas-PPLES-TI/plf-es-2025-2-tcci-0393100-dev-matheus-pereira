import { useEffect, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api";
import { parseValorReais } from "@/lib/valorBrasil";
import {
  getDefaultRates,
  getExplanation,
  OPERATION_OPTIONS,
  parsePercentInput,
  profileToApiCategory,
  simulateQuick,
  simulationTypeToApiTipo,
  type OperationType,
  type QuickSimulationResult,
  type SimulationType,
  type SimulationYear,
  type TaxProfile,
  YEAR_OPTIONS,
  PROFILE_OPTIONS,
} from "@/lib/taxSimulator";
import SimulationTypeCards from "./SimulationTypeCards";
import SimulationResultCards from "./SimulationResultCards";
import TaxAlert from "./TaxAlert";

type QuickSimulatorTabProps = {
  onError: (msg: string | null) => void;
};

export default function QuickSimulatorTab({ onError }: QuickSimulatorTabProps) {
  const [simulationType, setSimulationType] = useState<SimulationType>("PRECO_FINAL");
  const [operationValue, setOperationValue] = useState("");
  const [year, setYear] = useState<SimulationYear>("2026");
  const [profile, setProfile] = useState<TaxProfile>("PADRAO");
  const [operationKind, setOperationKind] = useState<OperationType>("SERVICO");
  const [cbsPercent, setCbsPercent] = useState("0,90");
  const [ibsPercent, setIbsPercent] = useState("0,10");
  const [result, setResult] = useState<QuickSimulationResult | null>(null);
  const [explanation, setExplanation] = useState(getExplanation("PRECO_FINAL"));
  const [loading, setLoading] = useState(false);
  const [useApi, setUseApi] = useState(false);

  useEffect(() => {
    if (profile !== "PERSONALIZADA") {
      const rates = getDefaultRates(year, profile);
      setCbsPercent(rates.cbs.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      setIbsPercent(rates.ibs.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    }
  }, [year, profile]);

  useEffect(() => {
    setExplanation(getExplanation(simulationType));
  }, [simulationType]);

  async function calcular() {
    const valor = parseValorReais(operationValue);
    if (!operationValue.trim() || valor <= 0) {
      onError("Informe um valor da operação maior que zero.");
      return;
    }
    const cbs = parsePercentInput(cbsPercent);
    const ibs = parsePercentInput(ibsPercent);
    if (cbs < 0 || ibs < 0) {
      onError("Informe alíquotas válidas para CBS e IBS.");
      return;
    }

    onError(null);
    setLoading(true);

    const local = simulateQuick({
      simulationType,
      operationValue: valor,
      cbsPercent: cbs,
      ibsPercent: ibs,
    });

    if (!local) {
      onError("Não foi possível calcular. Verifique as alíquotas informadas.");
      setLoading(false);
      return;
    }

    if (useApi) {
      try {
        const res = await api.post<{
          cbs?: number;
          ibs?: number;
          totalImpostos?: number;
          valorSemImposto?: number;
          valorFinal?: number;
          valor?: number;
        }>("/api/tributos/calcular", {
          valor,
          tipo: simulationTypeToApiTipo(simulationType),
          categoria: profileToApiCategory(profile),
        });
        const data = res.data;
        const totalTax = data.totalImpostos ?? (data.cbs ?? 0) + (data.ibs ?? 0);
        const opVal = data.valor ?? valor;
        setResult({
          operationValue: opVal,
          cbsValue: data.cbs ?? local.cbsValue,
          ibsValue: data.ibs ?? local.ibsValue,
          totalTax,
          netValue: data.valorSemImposto ?? local.netValue,
          finalPrice: data.valorFinal ?? local.finalPrice,
          taxBurdenPercent: opVal > 0 ? (totalTax / opVal) * 100 : local.taxBurdenPercent,
          cbsPercent: cbs,
          ibsPercent: ibs,
        });
      } catch (e: unknown) {
        setResult(local);
        onError(getApiErrorMessage(e, "API indisponível; exibindo simulação local."));
      } finally {
        setLoading(false);
      }
      return;
    }

    setResult(local);
    setLoading(false);
  }

  return (
    <div className="tax-sim__split">
      <div className="tax-sim__panel tax-sim__panel--form">
        <div className="tax-sim__card">
          <h2 className="tax-sim__card-title">Como você quer simular?</h2>
          <SimulationTypeCards value={simulationType} onChange={setSimulationType} />

          <div className="tax-sim__fields">
            <label className="tax-sim__label">
              Valor da operação (R$)
              <input
                type="text"
                className="tax-sim__input"
                inputMode="decimal"
                placeholder="Ex.: 1.000,00"
                value={operationValue}
                onChange={(e) => setOperationValue(e.target.value)}
              />
            </label>

            <label className="tax-sim__label">
              Ano da simulação
              <select className="tax-sim__select" value={year} onChange={(e) => setYear(e.target.value as SimulationYear)}>
                {YEAR_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="tax-sim__label">
              Perfil tributário
              <select
                className="tax-sim__select"
                value={profile}
                onChange={(e) => setProfile(e.target.value as TaxProfile)}
              >
                {PROFILE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="tax-sim__label">
              Tipo de operação
              <select
                className="tax-sim__select"
                value={operationKind}
                onChange={(e) => setOperationKind(e.target.value as OperationType)}
              >
                {OPERATION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="tax-sim__fields-row">
              <label className="tax-sim__label">
                Alíquota CBS (%)
                <input
                  type="text"
                  className="tax-sim__input"
                  inputMode="decimal"
                  value={cbsPercent}
                  disabled={profile !== "PERSONALIZADA"}
                  onChange={(e) => setCbsPercent(e.target.value)}
                />
              </label>
              <label className="tax-sim__label">
                Alíquota IBS (%)
                <input
                  type="text"
                  className="tax-sim__input"
                  inputMode="decimal"
                  value={ibsPercent}
                  disabled={profile !== "PERSONALIZADA"}
                  onChange={(e) => setIbsPercent(e.target.value)}
                />
              </label>
            </div>

            <label className="tax-sim__checkbox">
              <input type="checkbox" checked={useApi} onChange={(e) => setUseApi(e.target.checked)} />
              Validar também no servidor (quando disponível)
            </label>

            <button type="button" className="btn btn--primary tax-sim__btn" onClick={() => void calcular()} disabled={loading}>
              {loading ? "Calculando…" : "Calcular impacto tributário"}
            </button>
          </div>
        </div>

        <TaxAlert>
          Esta é uma simulação estimativa. O resultado pode mudar conforme CNAE, produto, serviço, NCM, município, UF,
          regime tributário e regras de transição.
        </TaxAlert>

        {result && <p className="tax-sim__explanation">{explanation}</p>}
      </div>

      <div className="tax-sim__panel tax-sim__panel--results">
        <SimulationResultCards result={result} />
      </div>
    </div>
  );
}
