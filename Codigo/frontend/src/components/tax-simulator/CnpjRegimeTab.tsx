import { useState } from "react";
import type { AxiosError } from "axios";
import { api, getApiErrorMessage } from "@/lib/api";

function maskCnpj(value: string): string {
  const n = value.replace(/\D/g, "").slice(0, 14);
  if (n.length <= 2) return n;
  if (n.length <= 5) return `${n.slice(0, 2)}.${n.slice(2)}`;
  if (n.length <= 8) return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5)}`;
  if (n.length <= 12) return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(8)}`;
  return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(8, 12)}-${n.slice(12, 14)}`;
}

function labelRegime(regime: string): string {
  if (regime === "MEI") return "MEI";
  if (regime === "SIMPLES_NACIONAL") return "Simples Nacional";
  if (regime === "NAO_OPTANTE_SIMPLES") return "Não optante do Simples";
  return regime || "—";
}

type CnpjRegimeTabProps = {
  onError: (msg: string | null) => void;
};

export default function CnpjRegimeTab({ onError }: CnpjRegimeTabProps) {
  const [cnpj, setCnpj] = useState("");
  const [result, setResult] = useState<{ nomeEmpresa: string; regime: string } | null>(null);
  const [erroLocal, setErroLocal] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function consultar() {
    const digits = cnpj.replace(/\D/g, "");
    if (digits.length !== 14) {
      setErroLocal("Informe um CNPJ com 14 dígitos.");
      return;
    }
    onError(null);
    setErroLocal(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await api.get<{ nomeEmpresa?: string; regime?: string }>(`/api/tributos/regime/${digits}`);
      setResult({
        nomeEmpresa: String(res.data?.nomeEmpresa ?? ""),
        regime: String(res.data?.regime ?? ""),
      });
    } catch (e: unknown) {
      const status = (e as AxiosError | undefined)?.response?.status;
      if (status === 404) setErroLocal("CNPJ não encontrado");
      else if (status === 500) setErroLocal("Falha ao consultar serviço de CNPJ. Tente novamente.");
      else setErroLocal(getApiErrorMessage(e, "Não foi possível consultar o CNPJ."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="tax-sim__card">
      <h2 className="tax-sim__card-title">Regime sugerido por CNPJ</h2>
      <p className="tax-sim__card-desc">Consulta opcional para apoiar a definição do perfil tributário na simulação.</p>
      <div className="tax-sim__inline">
        <input
          className="tax-sim__input"
          placeholder="00.000.000/0000-00"
          value={cnpj}
          onChange={(e) => setCnpj(maskCnpj(e.target.value))}
          maxLength={18}
        />
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => void consultar()}
          disabled={loading || cnpj.replace(/\D/g, "").length < 14}
        >
          {loading ? "Consultando…" : "Consultar regime"}
        </button>
      </div>
      {erroLocal && <p className="tax-sim__erro-inline">{erroLocal}</p>}
      {result && (
        <div className="tax-sim__regime-result">
          <p>
            <strong>Nome da empresa:</strong> {result.nomeEmpresa}
          </p>
          <p>
            <strong>Regime:</strong> {labelRegime(result.regime)}
          </p>
        </div>
      )}
    </div>
  );
}
