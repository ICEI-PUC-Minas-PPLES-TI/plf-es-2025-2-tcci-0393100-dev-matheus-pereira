import { useState, type SyntheticEvent } from "react";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { TAX_SIMULATOR_TABS, type TaxSimulatorTabId } from "@/lib/taxSimulator";
import QuickSimulatorTab from "./QuickSimulatorTab";
import PricingSimulationTab from "./PricingSimulationTab";
import TaxCreditTab from "./TaxCreditTab";
import NfeSimulationTab from "./NfeSimulationTab";
import CashbackTab from "./CashbackTab";
import AiHelpTab from "./AiHelpTab";
import CnpjRegimeTab from "./CnpjRegimeTab";

export default function TaxSimulatorPage() {
  const [aba, setAba] = useState<TaxSimulatorTabId>("rapido");
  const [erro, setErro] = useState<string | null>(null);

  return (
    <div className="page-reforma tax-sim">
      <header className="tax-sim__header">
        <p className="tax-sim__eyebrow">Reforma Tributária · CBS e IBS</p>
        <h1 className="tax-sim__title">Simulador de Impacto Tributário</h1>
        <p className="tax-sim__subtitle">
          Calcule CBS, IBS, valor líquido, preço final e créditos de forma simples.
        </p>
      </header>

      <Tabs
        value={aba}
        onChange={(_: SyntheticEvent, value: TaxSimulatorTabId) => {
          setAba(value);
          setErro(null);
        }}
        variant="scrollable"
        scrollButtons="auto"
        className="page-reforma__tabs tax-sim__tabs"
        aria-label="Seções do simulador tributário"
      >
        {TAX_SIMULATOR_TABS.map((tab) => (
          <Tab key={tab.id} label={tab.label} value={tab.id} id={`tab-tax-sim-${tab.id}`} />
        ))}
      </Tabs>

      {erro && (
        <div className="page-reforma__erro tax-sim__erro-global" role="alert">
          {erro}
          <button type="button" className="page-reforma__erro-fechar" onClick={() => setErro(null)} aria-label="Fechar">
            ×
          </button>
        </div>
      )}

      <div className="tax-sim__content" role="tabpanel">
        {aba === "rapido" && <QuickSimulatorTab onError={setErro} />}
        {aba === "formacao" && <PricingSimulationTab onError={setErro} />}
        {aba === "credito" && <TaxCreditTab onError={setErro} />}
        {aba === "nfe" && <NfeSimulationTab onError={setErro} />}
        {aba === "cashback" && <CashbackTab onError={setErro} />}
        {aba === "ia" && <AiHelpTab onError={setErro} />}
        {aba === "regime" && <CnpjRegimeTab onError={setErro} />}
      </div>
    </div>
  );
}
