import { SIMULATION_TYPE_OPTIONS, type SimulationType } from "@/lib/taxSimulator";

type SimulationTypeCardsProps = {
  value: SimulationType;
  onChange: (value: SimulationType) => void;
};

export default function SimulationTypeCards({ value, onChange }: SimulationTypeCardsProps) {
  return (
    <div className="tax-sim__type-cards" role="radiogroup" aria-label="Tipo de simulação">
      {SIMULATION_TYPE_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="radio"
          aria-checked={value === opt.id}
          className={`tax-sim__type-card${value === opt.id ? " tax-sim__type-card--active" : ""}`}
          onClick={() => onChange(opt.id)}
        >
          <span className="tax-sim__type-card-title">{opt.title}</span>
          <span className="tax-sim__type-card-desc">{opt.description}</span>
        </button>
      ))}
    </div>
  );
}
