import { useEffect, useRef, useState } from "react";
import type { AxiosError } from "axios";
import { api, getApiErrorMessage } from "@/lib/api";

type AbaId = "basico" | "credito" | "nfe" | "preco" | "cashback" | "ia";

type MensagemIA = { role: "user" | "assistant"; texto: string };

type RespostaConsultaIA = {
  sucesso?: boolean;
  resposta?: string;
  erro?: string | null;
};

/** Categoria do backend (PLENO, REDUZIDO, ZERO). */
type Categoria = "PLENO" | "REDUZIDO" | "ZERO";

/** Regime exibido no front; PADRAO mapeia para PLENO na API. */
type Regime = "PADRAO" | "REDUZIDO" | "ZERO";

function regimeParaCategoria(r: Regime): Categoria {
  return r === "PADRAO" ? "PLENO" : r;
}

/** Resposta do POST /api/tributos/calcular (campos variam por tipo). */
type ResultadoCalcular = {
  baseCalculo?: number;
  valorImposto?: number;
  valorSemImposto?: number;
  valorTotal?: number;
  cbs?: number;
  ibs?: number;
  totalImpostos?: number;
  valorFinal?: number;
  aliquotaEfetiva?: number;
  precoVenda?: number;
  margemLucro?: number;
  custoAquisicao?: number;
  tipo?: string;
  categoria?: string;
};

type ResultadoCredito = {
  impostoSaida: number;
  creditoEntrada: number;
  impostoDevido: number;
  creditoAcumulado: number;
};

type ItemNfe = { descricao: string; valorTotal: number; regime: Regime };

type ResultadoNfe = {
  subtotal: number;
  cbs: number;
  ibs: number;
  totalImpostos: number;
  totalNota: number;
  aliquotaEfetivaPercentual?: number;
  categoria?: string;
  itens?: unknown[];
};

type RegimePorCnpjResponse = {
  cnpj: string;
  nomeEmpresa: string;
  regime: "MEI" | "SIMPLES_NACIONAL" | "NAO_OPTANTE_SIMPLES" | string;
};

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Máscara CNPJ: 00.000.000/0000-00 (apenas dígitos, até 14) */
function maskCnpj(value: string): string {
  const n = value.replace(/\D/g, "").slice(0, 14);
  if (n.length <= 2) return n;
  if (n.length <= 5) return `${n.slice(0, 2)}.${n.slice(2)}`;
  if (n.length <= 8) return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5)}`;
  if (n.length <= 12) return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(8)}`;
  return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(8, 12)}-${n.slice(12, 14)}`;
}

const REGIMES: { value: Regime; label: string }[] = [
  { value: "PADRAO", label: "Padrão (26,7%)" },
  { value: "REDUZIDO", label: "Reduzido 50% (13,35%)" },
  { value: "ZERO", label: "Alíquota Zero (0%)" },
];

export default function WebReformaTributaria() {
  const [aba, setAba] = useState<AbaId>("basico");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Alíquotas (GET /api/tributos/aliquotas/{categoria})
  type Aliquotas = { categoria: string; cbs: number; ibs: number; total: number } | null;
  const [aliquotasPleno, setAliquotasPleno] = useState<Aliquotas>(null);
  const [aliquotasReduzido, setAliquotasReduzido] = useState<Aliquotas>(null);
  const [aliquotasZero, setAliquotasZero] = useState<Aliquotas>(null);

  // Regime por CNPJ (opcional) – GET /api/tributos/regime/{cnpj}
  const [cnpjRegime, setCnpjRegime] = useState("");
  const [regimeCnpjResult, setRegimeCnpjResult] = useState<RegimePorCnpjResponse | null>(null);
  const [loadingRegimeCnpj, setLoadingRegimeCnpj] = useState(false);
  const [erroRegimeCnpj, setErroRegimeCnpj] = useState<string | null>(null);

  // ABA 1: Básico
  const [valorBase, setValorBase] = useState("");
  const [tipoCalculo, setTipoCalculo] = useState<"POR_DENTRO" | "POR_FORA" | "SEPARAR_CBS_IBS">("POR_DENTRO");
  const [regime, setRegime] = useState<Regime>("PADRAO");
  const [resultadoBasico, setResultadoBasico] = useState<ResultadoCalcular | null>(null);

  // ABA 2: Crédito
  const [valorVenda, setValorVenda] = useState("");
  const [valorCompras, setValorCompras] = useState("");
  const [categoriaCredito, setCategoriaCredito] = useState<Regime>("PADRAO");
  const [resultadoCredito, setResultadoCredito] = useState<ResultadoCredito | null>(null);

  // ABA 3: NF-e
  const [itensNfe, setItensNfe] = useState<ItemNfe[]>([{ descricao: "", valorTotal: 0, regime: "PADRAO" }]);
  const [categoriaNfe, setCategoriaNfe] = useState<Regime>("PADRAO");
  const [resultadoNfe, setResultadoNfe] = useState<ResultadoNfe | null>(null);

  // ABA 4: Preço (MARGEM_LUCRO via POST /calcular)
  const [custoAquisicao, setCustoAquisicao] = useState("");
  const [margemLucro, setMargemLucro] = useState("");
  const [regimePreco, setRegimePreco] = useState<Regime>("PADRAO");
  const [resultadoPreco, setResultadoPreco] = useState<ResultadoCalcular | null>(null);

  // ABA Cashback
  const [valorCompraCashback, setValorCompraCashback] = useState("");
  const [percentualCashback, setPercentualCashback] = useState("1");
  const [resultadoCashback, setResultadoCashback] = useState<number | null>(null);

  // ABA 5: Consulta IA (chat)
  const [mensagensIA, setMensagensIA] = useState<MensagemIA[]>([]);
  const [perguntaIA, setPerguntaIA] = useState("");
  const [contextoIA, setContextoIA] = useState("");
  const [loadingIA, setLoadingIA] = useState(false);
  const chatFimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatFimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagensIA, loadingIA]);

  useEffect(() => {
    let cancelled = false;
    async function carregarAliquotas() {
      try {
        const [rPleno, rReduzido, rZero] = await Promise.all([
          api.get<Aliquotas>("/api/tributos/aliquotas/PLENO"),
          api.get<Aliquotas>("/api/tributos/aliquotas/REDUZIDO"),
          api.get<Aliquotas>("/api/tributos/aliquotas/ZERO"),
        ]);
        if (!cancelled) {
          setAliquotasPleno(rPleno.data);
          setAliquotasReduzido(rReduzido.data);
          setAliquotasZero(rZero.data);
        }
      } catch {
        if (!cancelled) {
          setAliquotasPleno(null);
          setAliquotasReduzido(null);
          setAliquotasZero(null);
        }
      }
    }
    carregarAliquotas();
    return () => { cancelled = true; };
  }, []);

  function limparErro() {
    setErro(null);
  }

  async function calcularBasico() {
    const v = parseFloat(valorBase.replace(/,/g, "."));
    if (!valorBase.trim() || isNaN(v) || v <= 0) {
      setErro("Informe um valor válido maior que zero.");
      return;
    }
    if (v > 999_999_999.99) {
      setErro("Valor muito alto. Use no máximo 2 casas decimais.");
      return;
    }
    setErro(null);
    setLoading(true);
    setResultadoBasico(null);
    try {
      const res = await api.post<ResultadoCalcular>("/api/tributos/calcular", {
        valor: v,
        tipo: tipoCalculo,
        categoria: regimeParaCategoria(regime),
      });
      setResultadoBasico(res.data);
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Erro ao calcular. Tente novamente."));
    } finally {
      setLoading(false);
    }
  }

  async function calcularCredito() {
    const vVenda = parseFloat(valorVenda.replace(/,/g, "."));
    const vCompras = parseFloat(valorCompras.replace(/,/g, "."));
    if (!valorVenda.trim() || isNaN(vVenda) || vVenda <= 0) {
      setErro("Informe o valor de venda.");
      return;
    }
    if (!valorCompras.trim() || isNaN(vCompras) || vCompras < 0) {
      setErro("Informe o valor de compras.");
      return;
    }
    setErro(null);
    setLoading(true);
    setResultadoCredito(null);
    try {
      const res = await api.post<ResultadoCredito>("/api/tributos/creditos/validar", {
        valorVenda: vVenda,
        valorCompras: vCompras,
        categoria: regimeParaCategoria(categoriaCredito),
      });
      setResultadoCredito(res.data);
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Erro ao calcular crédito. Tente novamente."));
    } finally {
      setLoading(false);
    }
  }

  function adicionarItemNfe() {
    setItensNfe((prev) => [...prev, { descricao: "", valorTotal: 0, regime: "PADRAO" }]);
  }

  function atualizarItemNfe(index: number, campo: keyof ItemNfe, valor: string | number) {
    setItensNfe((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [campo]: valor } : item))
    );
  }

  function removerItemNfe(index: number) {
    if (itensNfe.length <= 1) return;
    setItensNfe((prev) => prev.filter((_, i) => i !== index));
  }

  async function gerarNfe() {
    const itens = itensNfe
      .map((i) => ({
        nome: i.descricao.trim() || "Item",
        valorTotal: Number(i.valorTotal) || 0,
      }))
      .filter((i) => i.valorTotal > 0);
    if (itens.length === 0) {
      setErro("Adicione ao menos um item com valor maior que zero.");
      return;
    }
    setErro(null);
    setLoading(true);
    setResultadoNfe(null);
    try {
      const res = await api.post<ResultadoNfe>("/api/tributos/nota-fiscal/gerar", {
        categoria: regimeParaCategoria(categoriaNfe),
        itens,
      });
      setResultadoNfe(res.data);
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Erro ao gerar nota. Tente novamente."));
    } finally {
      setLoading(false);
    }
  }

  async function calcularPreco() {
    const custo = parseFloat(custoAquisicao.replace(/,/g, "."));
    const margemPct = parseFloat(margemLucro.replace(/,/g, "."));
    if (!custoAquisicao.trim() || isNaN(custo) || custo <= 0) {
      setErro("Informe o custo de aquisição.");
      return;
    }
    if (!margemLucro.trim() || isNaN(margemPct) || margemPct < 0) {
      setErro("Informe a margem de lucro desejada (%).");
      return;
    }
    const margemDesejada = margemPct / 100;
    setErro(null);
    setLoading(true);
    setResultadoPreco(null);
    try {
      const res = await api.post<ResultadoCalcular>("/api/tributos/calcular", {
        tipo: "MARGEM_LUCRO",
        valor: 0,
        categoria: regimeParaCategoria(regimePreco),
        custoAquisicao: custo,
        margemDesejada,
      });
      setResultadoPreco(res.data);
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Erro ao calcular preço. Tente novamente."));
    } finally {
      setLoading(false);
    }
  }

  async function enviarConsultaIA(e: React.FormEvent) {
    e.preventDefault();
    const perguntaTrim = perguntaIA.trim();
    if (!perguntaTrim) {
      setErro("Digite sua pergunta sobre a reforma tributária.");
      return;
    }
    setErro(null);
    setLoadingIA(true);
    const textoUsuario = perguntaTrim;
    setPerguntaIA("");
    setMensagensIA((prev) => [...prev, { role: "user", texto: textoUsuario }]);
    try {
      const res = await api.post<RespostaConsultaIA>("/api/tributos/consulta-ia", {
        pergunta: textoUsuario,
        ...(contextoIA.trim() && { contexto: contextoIA.trim() }),
      });
      const data = res.data;
      const respostaTexto =
        data?.sucesso === false && data?.erro
          ? data.erro
          : (data?.resposta ?? (data?.erro ? data.erro : "Resposta não disponível. Verifique se a consulta à IA está configurada no servidor."));
      setMensagensIA((prev) => [...prev, { role: "assistant", texto: respostaTexto }]);
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, "Não foi possível enviar a pergunta. Verifique a conexão ou se a consulta à IA está disponível.");
      setMensagensIA((prev) => [...prev, { role: "assistant", texto: msg }]);
    } finally {
      setLoadingIA(false);
    }
  }

  async function consultarRegimeCnpj() {
    const cnpjNumerico = cnpjRegime.replace(/\D/g, "");
    if (cnpjNumerico.length !== 14) {
      setErroRegimeCnpj("Informe um CNPJ com 14 dígitos.");
      return;
    }
    setErroRegimeCnpj(null);
    setRegimeCnpjResult(null);
    setLoadingRegimeCnpj(true);
    try {
      const res = await api.get<RegimePorCnpjResponse>(`/api/tributos/regime/${cnpjNumerico}`);
      setRegimeCnpjResult({
        cnpj: String(res.data?.cnpj ?? cnpjNumerico),
        nomeEmpresa: String(res.data?.nomeEmpresa ?? ""),
        regime: String(res.data?.regime ?? ""),
      });
    } catch (e: unknown) {
      const status = (e as AxiosError | undefined)?.response?.status;
      if (status === 404) {
        setErroRegimeCnpj("CNPJ não encontrado");
      } else if (status === 500) {
        setErroRegimeCnpj("Falha ao consultar serviço de CNPJ, tente novamente");
      } else {
        setErroRegimeCnpj(getApiErrorMessage(e, "Não foi possível consultar o CNPJ agora. Tente novamente."));
      }
    } finally {
      setLoadingRegimeCnpj(false);
    }
  }

  function labelRegimeCnpj(regime: RegimePorCnpjResponse["regime"]): string {
    if (regime === "MEI") return "MEI";
    if (regime === "SIMPLES_NACIONAL") return "Simples Nacional";
    if (regime === "NAO_OPTANTE_SIMPLES") return "Não optante do Simples";
    return regime || "—";
  }

  async function calcularCashback() {
    const v = parseFloat(valorCompraCashback.replace(/,/g, "."));
    const pct = parseFloat(percentualCashback.replace(/,/g, "."));
    if (!valorCompraCashback.trim() || isNaN(v) || v <= 0) {
      setErro("Informe o valor da compra.");
      return;
    }
    setErro(null);
    setLoading(true);
    setResultadoCashback(null);
    try {
      const res = await api.get<{ cashbackCBS: number }>("/api/tributos/cashback", {
        params: {
          valorCompra: v,
          percentualDevolucao: !Number.isNaN(pct) && pct >= 0 && pct <= 1 ? pct : 1,
        },
      });
      setResultadoCashback(res.data?.cashbackCBS ?? 0);
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Erro ao calcular cashback. Tente novamente."));
    } finally {
      setLoading(false);
    }
  }

  function limparTudo() {
    setValorBase("");
    setTipoCalculo("POR_DENTRO");
    setRegime("PADRAO");
    setResultadoBasico(null);
    setValorVenda("");
    setValorCompras("");
    setCategoriaCredito("PADRAO");
    setResultadoCredito(null);
    setItensNfe([{ descricao: "", valorTotal: 0, regime: "PADRAO" }]);
    setCategoriaNfe("PADRAO");
    setResultadoNfe(null);
    setCustoAquisicao("");
    setMargemLucro("");
    setRegimePreco("PADRAO");
    setResultadoPreco(null);
    setValorCompraCashback("");
    setPercentualCashback("1");
    setResultadoCashback(null);
    setCnpjRegime("");
    setRegimeCnpjResult(null);
    setErroRegimeCnpj(null);
    setMensagensIA([]);
    setPerguntaIA("");
    setContextoIA("");
    setErro(null);
  }

  const abas: { id: AbaId; label: string }[] = [
    { id: "basico", label: "Básico" },
    { id: "credito", label: "Crédito" },
    { id: "nfe", label: "NF-e" },
    { id: "preco", label: "Preço" },
    { id: "cashback", label: "Cashback" },
    { id: "ia", label: "Dúvidas (IA)" },
  ];

  return (
    <div className="page-reforma">
      <div className="page-reforma__header">
        <h1 className="page-reforma__title">Calculadora Reforma Tributária</h1>
        <p className="page-reforma__subtitle">Cálculo de CBS e IBS – Nova Reforma Tributária Brasileira</p>
      </div>

      {aba !== "ia" && (aliquotasPleno || aliquotasReduzido || aliquotasZero) && (
        <div className="page-reforma__aliquotas">
          <p className="page-reforma__aliquotas-aviso">Alíquotas por categoria (estimativas). Consulte a legislação.</p>
          <div className="page-reforma__aliquotas-cards">
            {aliquotasPleno && (
              <div className="page-reforma__aliquota-card">
                <span className="page-reforma__aliquota-cat">Pleno</span>
                <span>CBS {(aliquotasPleno.cbs * 100).toFixed(1)}% · IBS {(aliquotasPleno.ibs * 100).toFixed(1)}% · Total {(aliquotasPleno.total * 100).toFixed(1)}%</span>
              </div>
            )}
            {aliquotasReduzido && (
              <div className="page-reforma__aliquota-card">
                <span className="page-reforma__aliquota-cat">Reduzido</span>
                <span>CBS {(aliquotasReduzido.cbs * 100).toFixed(1)}% · IBS {(aliquotasReduzido.ibs * 100).toFixed(1)}% · Total {(aliquotasReduzido.total * 100).toFixed(1)}%</span>
              </div>
            )}
            {aliquotasZero && (
              <div className="page-reforma__aliquota-card">
                <span className="page-reforma__aliquota-cat">Zero</span>
                <span>CBS 0% · IBS 0% · Total 0%</span>
              </div>
            )}
          </div>
        </div>
      )}

      {aba !== "ia" && (
      <div className="page-reforma__regime-cnpj">
        <h3 className="page-reforma__regime-cnpj-titulo">Regime sugerido por CNPJ (opcional)</h3>
        <div className="page-reforma__regime-cnpj-form">
          <input
            type="text"
            className="page-reforma__input"
            placeholder="00.000.000/0000-00"
            value={cnpjRegime}
            onChange={(e) => setCnpjRegime(maskCnpj(e.target.value))}
            maxLength={18}
            inputMode="numeric"
            autoComplete="off"
          />
          <button
            type="button"
            className="btn btn--secondary page-reforma__btn"
            onClick={consultarRegimeCnpj}
            disabled={loadingRegimeCnpj || cnpjRegime.replace(/\D/g, "").length < 14}
          >
            {loadingRegimeCnpj ? "Consultando…" : "Consultar regime"}
          </button>
        </div>
        {erroRegimeCnpj && <p className="page-reforma__erro page-reforma__erro-inline" role="alert">{erroRegimeCnpj}</p>}
        {regimeCnpjResult && (
          <div className="page-reforma__aliquota-card page-reforma__regime-cnpj-result">
            <span><strong>Nome da empresa:</strong> {regimeCnpjResult.nomeEmpresa}</span>
            <span><strong>Regime:</strong> {labelRegimeCnpj(regimeCnpjResult.regime)}</span>
          </div>
        )}
      </div>
      )}

      <div className="page-reforma__tabs" role="tablist">
        {abas.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={aba === id}
            className={`page-reforma__tab ${aba === id ? "page-reforma__tab--active" : ""}`}
            onClick={() => { setAba(id); setErro(null); }}
          >
            {label}
          </button>
        ))}
      </div>

      {erro && (
        <div className="page-reforma__erro" role="alert">
          {erro}
          <button type="button" className="page-reforma__erro-fechar" onClick={limparErro} aria-label="Fechar">×</button>
        </div>
      )}

      <div className="page-reforma__conteudo">
        {aba === "basico" && (
          <div className="page-reforma__aba">
            <div className="page-reforma__card">
              <h2 className="page-reforma__card-titulo">Cálculo básico CBS e IBS</h2>
              <div className="page-reforma__form">
                <label className="page-reforma__label">
                  Valor (R$)
                  <input
                    type="text"
                    inputMode="decimal"
                    className="page-reforma__input"
                    placeholder="Ex.: 1000,00"
                    value={valorBase}
                    onChange={(e) => setValorBase(e.target.value)}
                  />
                </label>
                <fieldset className="page-reforma__fieldset">
                  <legend className="page-reforma__legend">Tipo de cálculo</legend>
                  <label className="page-reforma__radio">
                    <input
                      type="radio"
                      name="tipoCalculo"
                      checked={tipoCalculo === "POR_DENTRO"}
                      onChange={() => setTipoCalculo("POR_DENTRO")}
                    />
                    <span>Por Dentro (preço já inclui imposto)</span>
                  </label>
                  <label className="page-reforma__radio">
                    <input
                      type="radio"
                      name="tipoCalculo"
                      checked={tipoCalculo === "POR_FORA"}
                      onChange={() => setTipoCalculo("POR_FORA")}
                    />
                    <span>Por Fora (adicionar imposto ao valor)</span>
                  </label>
                  <label className="page-reforma__radio">
                    <input
                      type="radio"
                      name="tipoCalculo"
                      checked={tipoCalculo === "SEPARAR_CBS_IBS"}
                      onChange={() => setTipoCalculo("SEPARAR_CBS_IBS")}
                    />
                    <span>Separar CBS e IBS (valor já inclui imposto)</span>
                  </label>
                </fieldset>
                <label className="page-reforma__label">
                  Regime tributário
                  <select
                    className="page-reforma__select"
                    value={regime}
                    onChange={(e) => setRegime(e.target.value as Regime)}
                  >
                    {REGIMES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="btn btn--primary page-reforma__btn"
                  onClick={calcularBasico}
                  disabled={loading}
                >
                  {loading ? "Calculando…" : "Calcular"}
                </button>
              </div>
            </div>
            {resultadoBasico && (
              <div className="page-reforma__resultado">
                <h3 className="page-reforma__resultado-titulo">Resultado do cálculo</h3>
                {(resultadoBasico.baseCalculo != null) && (
                  <div className="page-reforma__linha">
                    <span>Base de cálculo</span>
                    <strong>{formatarMoeda(resultadoBasico.baseCalculo ?? 0)}</strong>
                  </div>
                )}
                {(resultadoBasico.cbs != null) && (
                  <div className="page-reforma__linha page-reforma__linha--cbs">
                    <span>CBS</span>
                    <strong>{formatarMoeda(resultadoBasico.cbs)}</strong>
                  </div>
                )}
                {(resultadoBasico.ibs != null) && (
                  <div className="page-reforma__linha page-reforma__linha--ibs">
                    <span>IBS</span>
                    <strong>{formatarMoeda(resultadoBasico.ibs ?? 0)}</strong>
                  </div>
                )}
                {(resultadoBasico.totalImpostos != null || resultadoBasico.valorImposto != null) && (
                  <>
                    <hr className="page-reforma__hr" />
                    <div className="page-reforma__linha page-reforma__linha--total">
                      <span>Total de impostos</span>
                      <strong>{formatarMoeda(resultadoBasico.totalImpostos ?? resultadoBasico.valorImposto ?? 0)}</strong>
                    </div>
                  </>
                )}
                {(resultadoBasico.valorTotal != null || resultadoBasico.valorFinal != null || resultadoBasico.valorSemImposto != null) && (
                  <div className="page-reforma__linha">
                    <span>{resultadoBasico.valorTotal != null ? "Valor total" : resultadoBasico.valorSemImposto != null ? "Valor sem imposto" : "Valor final"}</span>
                    <strong>{formatarMoeda(resultadoBasico.valorTotal ?? resultadoBasico.valorFinal ?? resultadoBasico.valorSemImposto ?? 0)}</strong>
                  </div>
                )}
                {(resultadoBasico.aliquotaEfetiva != null) && (
                  <div className="page-reforma__linha">
                    <span>Alíquota efetiva</span>
                    <strong>{resultadoBasico.aliquotaEfetiva.toFixed(1)}%</strong>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {aba === "credito" && (
          <div className="page-reforma__aba">
            <div className="page-reforma__card">
              <h2 className="page-reforma__card-titulo">Cálculo com créditos tributários</h2>
              <p className="page-reforma__hint" title="Não-cumulatividade: crédito das entradas pode ser usado para compensar o imposto devido nas saídas.">
                ℹ️ Crédito de entrada compensa imposto de saída (não-cumulatividade).
              </p>
              <div className="page-reforma__form">
                <label className="page-reforma__label">
                  Valor de venda (R$)
                  <input
                    type="text"
                    inputMode="decimal"
                    className="page-reforma__input"
                    placeholder="Ex.: 5000,00"
                    value={valorVenda}
                    onChange={(e) => setValorVenda(e.target.value)}
                  />
                </label>
                <label className="page-reforma__label">
                  Valor de compras (R$)
                  <input
                    type="text"
                    inputMode="decimal"
                    className="page-reforma__input"
                    placeholder="Ex.: 3000,00"
                    value={valorCompras}
                    onChange={(e) => setValorCompras(e.target.value)}
                  />
                </label>
                <label className="page-reforma__label">
                  Categoria
                  <select
                    className="page-reforma__select"
                    value={categoriaCredito}
                    onChange={(e) => setCategoriaCredito(e.target.value as Regime)}
                  >
                    {REGIMES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="btn btn--primary page-reforma__btn"
                  onClick={calcularCredito}
                  disabled={loading}
                >
                  {loading ? "Calculando…" : "Calcular crédito"}
                </button>
              </div>
            </div>
            {resultadoCredito && (
              <div className="page-reforma__resultado">
                <h3 className="page-reforma__resultado-titulo">Resultado</h3>
                <div className="page-reforma__linha">
                  <span>Imposto de saída</span>
                  <strong>{formatarMoeda(resultadoCredito.impostoSaida)}</strong>
                </div>
                <div className="page-reforma__linha">
                  <span>Crédito de entrada</span>
                  <strong>{formatarMoeda(resultadoCredito.creditoEntrada)}</strong>
                </div>
                <div className="page-reforma__linha page-reforma__linha--total">
                  <span>Imposto devido</span>
                  <strong>{formatarMoeda(resultadoCredito.impostoDevido)}</strong>
                </div>
                {resultadoCredito.creditoAcumulado > 0 && (
                  <div className="page-reforma__linha page-reforma__linha--destaque">
                    <span>Crédito acumulado</span>
                    <strong>{formatarMoeda(resultadoCredito.creditoAcumulado)}</strong>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {aba === "nfe" && (
          <div className="page-reforma__aba">
            <div className="page-reforma__card">
              <h2 className="page-reforma__card-titulo">Nota fiscal (múltiplos itens)</h2>
              <div className="page-reforma__nfe-itens">
                {itensNfe.map((item, index) => (
                  <div key={index} className="page-reforma__nfe-item">
                    <input
                      type="text"
                      className="page-reforma__input page-reforma__input--desc"
                      placeholder="Descrição"
                      value={item.descricao}
                      onChange={(e) => atualizarItemNfe(index, "descricao", e.target.value)}
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="page-reforma__input page-reforma__input--valor"
                      placeholder="Valor total (R$)"
                      value={item.valorTotal || ""}
                      onChange={(e) => atualizarItemNfe(index, "valorTotal", parseFloat(e.target.value) || 0)}
                    />
                    <button
                      type="button"
                      className="btn btn--secondary btn--small"
                      onClick={() => removerItemNfe(index)}
                      disabled={itensNfe.length <= 1}
                      title="Remover item"
                    >
                      −
                    </button>
                  </div>
                ))}
                <button type="button" className="btn btn--secondary page-reforma__btn-add" onClick={adicionarItemNfe}>
                  + Adicionar item
                </button>
              </div>
              <button
                type="button"
                className="btn btn--primary page-reforma__btn"
                onClick={gerarNfe}
                disabled={loading}
              >
                {loading ? "Gerando…" : "Gerar NF-e"}
              </button>
            </div>
            {resultadoNfe && (
              <div className="page-reforma__resultado">
                <h3 className="page-reforma__resultado-titulo">Resumo da nota</h3>
                <div className="page-reforma__linha">
                  <span>Subtotal</span>
                  <strong>{formatarMoeda(resultadoNfe.subtotal)}</strong>
                </div>
                <div className="page-reforma__linha page-reforma__linha--cbs">
                  <span>CBS</span>
                  <strong>{formatarMoeda(resultadoNfe.cbs)}</strong>
                </div>
                <div className="page-reforma__linha page-reforma__linha--ibs">
                  <span>IBS</span>
                  <strong>{formatarMoeda(resultadoNfe.ibs)}</strong>
                </div>
                <hr className="page-reforma__hr" />
                <div className="page-reforma__linha page-reforma__linha--total">
                  <span>Total da nota</span>
                  <strong>{formatarMoeda(resultadoNfe.totalNota)}</strong>
                </div>
                {resultadoNfe.aliquotaEfetivaPercentual != null && (
                  <div className="page-reforma__linha">
                    <span>Alíquota efetiva</span>
                    <strong>{resultadoNfe.aliquotaEfetivaPercentual.toFixed(1)}%</strong>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {aba === "preco" && (
          <div className="page-reforma__aba">
            <div className="page-reforma__card">
              <h2 className="page-reforma__card-titulo">Calcular preço de venda</h2>
              <div className="page-reforma__form">
                <label className="page-reforma__label">
                  Custo de aquisição (R$)
                  <input
                    type="text"
                    inputMode="decimal"
                    className="page-reforma__input"
                    placeholder="Ex.: 50,00"
                    value={custoAquisicao}
                    onChange={(e) => setCustoAquisicao(e.target.value)}
                  />
                </label>
                <label className="page-reforma__label">
                  Margem de lucro desejada (%)
                  <input
                    type="text"
                    inputMode="decimal"
                    className="page-reforma__input"
                    placeholder="Ex.: 30"
                    value={margemLucro}
                    onChange={(e) => setMargemLucro(e.target.value)}
                  />
                </label>
                <label className="page-reforma__label">
                  Regime tributário
                  <select
                    className="page-reforma__select"
                    value={regimePreco}
                    onChange={(e) => setRegimePreco(e.target.value as Regime)}
                  >
                    {REGIMES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="btn btn--primary page-reforma__btn"
                  onClick={calcularPreco}
                  disabled={loading}
                >
                  {loading ? "Calculando…" : "Calcular preço"}
                </button>
              </div>
            </div>
            {resultadoPreco && (
              <div className="page-reforma__resultado">
                <h3 className="page-reforma__resultado-titulo">Resultado</h3>
                {resultadoPreco.custoAquisicao != null && (
                  <div className="page-reforma__linha">
                    <span>Custo de aquisição</span>
                    <strong>{formatarMoeda(resultadoPreco.custoAquisicao)}</strong>
                  </div>
                )}
                {resultadoPreco.precoVenda != null && (
                  <div className="page-reforma__linha page-reforma__linha--total">
                    <span>Preço de venda sugerido</span>
                    <strong>{formatarMoeda(resultadoPreco.precoVenda)}</strong>
                  </div>
                )}
                {(resultadoPreco.valorImposto != null || resultadoPreco.totalImpostos != null) && (
                  <div className="page-reforma__linha">
                    <span>Impostos</span>
                    <strong>{formatarMoeda(resultadoPreco.valorImposto ?? resultadoPreco.totalImpostos ?? 0)}</strong>
                  </div>
                )}
                {resultadoPreco.margemLucro != null && (
                  <div className="page-reforma__linha page-reforma__linha--destaque">
                    <span>Margem / lucro líquido</span>
                    <strong>{formatarMoeda(resultadoPreco.margemLucro)}</strong>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {aba === "cashback" && (
          <div className="page-reforma__aba">
            <div className="page-reforma__card">
              <h2 className="page-reforma__card-titulo">Cashback CBS</h2>
              <p className="page-reforma__hint">Calcula o valor de cashback de CBS (ex.: devolução para baixa renda).</p>
              <div className="page-reforma__form">
                <label className="page-reforma__label">
                  Valor da compra (R$)
                  <input
                    type="text"
                    inputMode="decimal"
                    className="page-reforma__input"
                    placeholder="Ex.: 100,00"
                    value={valorCompraCashback}
                    onChange={(e) => setValorCompraCashback(e.target.value)}
                  />
                </label>
                <label className="page-reforma__label">
                  Percentual de devolução (0 a 1; ex.: 1 = 100%)
                  <input
                    type="text"
                    inputMode="decimal"
                    className="page-reforma__input"
                    placeholder="1"
                    value={percentualCashback}
                    onChange={(e) => setPercentualCashback(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="btn btn--primary page-reforma__btn"
                  onClick={calcularCashback}
                  disabled={loading}
                >
                  {loading ? "Calculando…" : "Calcular cashback"}
                </button>
              </div>
            </div>
            {resultadoCashback != null && (
              <div className="page-reforma__resultado">
                <h3 className="page-reforma__resultado-titulo">Resultado</h3>
                <div className="page-reforma__linha page-reforma__linha--total">
                  <span>Cashback CBS</span>
                  <strong>{formatarMoeda(resultadoCashback)}</strong>
                </div>
              </div>
            )}
          </div>
        )}

        {aba === "ia" && (
          <div className="page-reforma__aba page-reforma__aba--chat">
            <div className="page-reforma__card">
              <h2 className="page-reforma__card-titulo">Pergunte à IA sobre a Reforma Tributária</h2>
              <p className="page-reforma__aviso-ia" role="status">
                As informações são orientativas. Consulte sempre a legislação e um profissional.
              </p>
              <div className="page-reforma__chat-area" aria-live="polite">
                {mensagensIA.length === 0 && (
                  <p className="page-reforma__chat-vazio">
                    Faça uma pergunta sobre CBS, IBS, créditos, não-cumulatividade ou outros temas da reforma tributária.
                  </p>
                )}
                {mensagensIA.map((msg, i) => (
                  <div
                    key={i}
                    className={`page-reforma__chat-msg page-reforma__chat-msg--${msg.role}`}
                  >
                    <span className="page-reforma__chat-role">
                      {msg.role === "user" ? "Você" : "IA"}
                    </span>
                    <div className="page-reforma__chat-texto">{msg.texto}</div>
                  </div>
                ))}
                {loadingIA && (
                  <div className="page-reforma__chat-msg page-reforma__chat-msg--assistant">
                    <span className="page-reforma__chat-role">IA</span>
                    <div className="page-reforma__chat-texto page-reforma__chat-typing">Pensando…</div>
                  </div>
                )}
                <div ref={chatFimRef} aria-hidden="true" />
              </div>
              <form onSubmit={enviarConsultaIA} className="page-reforma__chat-form">
                <label className="page-reforma__label">
                  Sua pergunta
                  <textarea
                    className="page-reforma__input page-reforma__input--textarea"
                    placeholder="Ex.: Como funciona o crédito de CBS nas operações interestaduais?"
                    value={perguntaIA}
                    onChange={(e) => setPerguntaIA(e.target.value)}
                    rows={3}
                    disabled={loadingIA}
                  />
                </label>
                <label className="page-reforma__label">
                  Contexto (opcional)
                  <textarea
                    className="page-reforma__input page-reforma__input--textarea"
                    placeholder="Ex.: Empresa no regime pleno, vendas para SP e MG."
                    value={contextoIA}
                    onChange={(e) => setContextoIA(e.target.value)}
                    rows={2}
                    disabled={loadingIA}
                  />
                </label>
                <button
                  type="submit"
                  className="btn btn--primary page-reforma__btn"
                  disabled={loadingIA || !perguntaIA.trim()}
                >
                  {loadingIA ? "Enviando…" : "Perguntar"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      <div className="page-reforma__acoes">
        <button type="button" className="btn btn--secondary" onClick={limparTudo}>
          Limpar
        </button>
      </div>
    </div>
  );
}
