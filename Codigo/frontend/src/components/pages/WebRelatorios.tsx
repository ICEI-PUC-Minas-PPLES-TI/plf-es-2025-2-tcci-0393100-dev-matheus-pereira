import { useEffect, useState } from "react";
import { api, getApiErrorMessage, getRelatorioErrorMessage, isMockEnabled, normalizeListResponse } from "@/lib/api";
import { exportarCSV } from "@/lib/exportarCsv";
import { exportarRelatorioPdf, type DadosRelatorioPdf } from "@/lib/relatorioPdf";
import {
  normalizeClienteFromApi,
  normalizeInadimplenciaPeriodoFromApi,
  normalizeRankingFromApi,
  normalizeResumoFinanceiroFromApi,
} from "@/lib/apiNormalizers";
import type {
  Cliente,
  RankingDevedorItem,
  ExtratoCliente,
  InadimplenciaPeriodoRelatorio,
  ResumoFinanceiro,
  AgingRelatorio,
  EfetividadeCobrancaRelatorio,
} from "@/types/api";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";

const ABAS = [
  { id: "ranking", label: "Ranking Devedores" },
  { id: "extrato", label: "Extrato por Cliente" },
  { id: "inadimplencia", label: "Inadimplência por Período" },
  { id: "pagamentos", label: "Pagamentos Recebidos" },
  { id: "aging", label: "Aging" },
  { id: "efetividade", label: "Efetividade Cobrança" },
] as const;

type AbaId = (typeof ABAS)[number]["id"];

function formatarData(s: string) {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatarMoeda(n: number | null | undefined) {
  const valor = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarPercentual(n: number | null | undefined, casas = 1) {
  const valor = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return `${valor.toFixed(casas)}%`;
}

function normalizeAgingResponse(data: unknown): AgingRelatorio {
  const raw = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const faixasRaw = Array.isArray(raw.faixas) ? (raw.faixas as Record<string, unknown>[]) : [];
  const valorTotalBase = Number(raw.valorTotalGeral ?? raw.valorTotal ?? 0);
  const valorTotalGeral = Number.isFinite(valorTotalBase) ? valorTotalBase : 0;
  const faixas = faixasRaw.map((f) => {
    const valorRaw = Number(f.valorTotal ?? f.valor ?? 0);
    const valorTotal = Number.isFinite(valorRaw) ? valorRaw : 0;
    const qtdRaw = Number(f.qtdDividas ?? f.quantidade ?? 0);
    const qtdDividas = Number.isFinite(qtdRaw) ? qtdRaw : 0;
    const percentualRaw = Number(f.percentual);
    const percentual =
      Number.isFinite(percentualRaw) ? percentualRaw : valorTotalGeral > 0 ? (valorTotal / valorTotalGeral) * 100 : 0;
    return {
      faixa: String(f.faixa ?? "-"),
      qtdDividas,
      valorTotal,
      percentual,
    };
  });
  return { faixas, valorTotalGeral };
}

export default function WebRelatorios() {
  const [aba, setAba] = useState<AbaId>("ranking");
  const [erro, setErro] = useState<string | null>(null);

  // Clientes (para busca do extrato)
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);

  // Ranking
  const [ranking, setRanking] = useState<RankingDevedorItem[]>([]);
  const [loadingRanking, setLoadingRanking] = useState(false);
  const [filtroPeriodo, setFiltroPeriodo] = useState("mes");
  const [filtroLimit, setFiltroLimit] = useState(20);
  const [filtroValorMin, setFiltroValorMin] = useState("");
  const [filtroQtdDividas, setFiltroQtdDividas] = useState("");
  const [filtroDiasAtraso, setFiltroDiasAtraso] = useState("");

  // Extrato
  const [clienteExtratoId, setClienteExtratoId] = useState<string>("");
  const [extrato, setExtrato] = useState<ExtratoCliente | null>(null);
  const [loadingExtrato, setLoadingExtrato] = useState(false);

  // Inadimplência período
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().slice(0, 10));
  const [inadPeriodo, setInadPeriodo] = useState<InadimplenciaPeriodoRelatorio | null>(null);
  const [loadingInadPeriodo, setLoadingInadPeriodo] = useState(false);

  // Pagamentos recebidos
  const [dataInicioPag, setDataInicioPag] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [dataFimPag, setDataFimPag] = useState(() => new Date().toISOString().slice(0, 10));
  const [pagamentos, setPagamentos] = useState<ResumoFinanceiro | null>(null);
  const [loadingPagamentos, setLoadingPagamentos] = useState(false);

  // Aging
  const [aging, setAging] = useState<AgingRelatorio | null>(null);
  const [loadingAging, setLoadingAging] = useState(false);

  // Efetividade
  const [mesEfetividade, setMesEfetividade] = useState(() => new Date().toISOString().slice(0, 7));
  const [efetividade, setEfetividade] = useState<EfetividadeCobrancaRelatorio | null>(null);
  const [loadingEfetividade, setLoadingEfetividade] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingClientes(true);
      try {
        const r = await api.get("/api/clientes", { params: { page: 0, size: 500 } });
        const list = normalizeListResponse(r.data);
        setClientes(list.map((c) => normalizeClienteFromApi(c as Record<string, unknown>)));
      } catch {
        setClientes([]);
      } finally {
        setLoadingClientes(false);
      }
    })();
  }, []);

  async function carregarRanking() {
    setErro(null);
    setLoadingRanking(true);
    try {
      const params = new URLSearchParams();
      params.set("periodo", filtroPeriodo);
      params.set("limit", String(filtroLimit));
      if (filtroValorMin) params.set("valorMin", filtroValorMin);
      if (filtroQtdDividas) params.set("qtdDividas", filtroQtdDividas);
      if (filtroDiasAtraso) params.set("diasAtraso", filtroDiasAtraso);
      const r = await api.get<RankingDevedorItem[] | { ranking?: unknown[] }>(`/api/relatorios/ranking-devedores?${params}`);
      setRanking(isMockEnabled() && Array.isArray(r.data) ? r.data : normalizeRankingFromApi(r.data));
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao carregar ranking"));
      setRanking([]);
    } finally {
      setLoadingRanking(false);
    }
  }

  useEffect(() => {
    if (aba === "ranking") carregarRanking();
  }, [aba, filtroPeriodo, filtroLimit, filtroValorMin, filtroQtdDividas, filtroDiasAtraso]);

  async function carregarExtrato() {
    if (!clienteExtratoId) {
      setExtrato(null);
      return;
    }
    setErro(null);
    setLoadingExtrato(true);
    try {
      const r = await api.get<ExtratoCliente>(`/api/relatorios/extrato-cliente/${clienteExtratoId}`);
      setExtrato(r.data);
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao carregar extrato"));
      setExtrato(null);
    } finally {
      setLoadingExtrato(false);
    }
  }

  useEffect(() => {
    if (aba === "extrato" && clienteExtratoId) carregarExtrato();
    else if (aba === "extrato" && !clienteExtratoId) setExtrato(null);
  }, [aba, clienteExtratoId]);

  async function carregarInadimplenciaPeriodo() {
    setErro(null);
    setLoadingInadPeriodo(true);
    try {
      const r = await api.get(
        `/api/relatorios/inadimplencia-periodo?dataInicio=${dataInicio}&dataFim=${dataFim}`
      );
      setInadPeriodo(isMockEnabled() ? (r.data as InadimplenciaPeriodoRelatorio) : (normalizeInadimplenciaPeriodoFromApi(r.data) ?? null));
    } catch (e: unknown) {
      setErro(getApiErrorMessage(e, "Falha ao carregar relatório"));
      setInadPeriodo(null);
    } finally {
      setLoadingInadPeriodo(false);
    }
  }

  useEffect(() => {
    if (aba === "inadimplencia") carregarInadimplenciaPeriodo();
  }, [aba, dataInicio, dataFim]);

  async function carregarPagamentos() {
    setErro(null);
    setLoadingPagamentos(true);
    try {
      const r = await api.get("/api/relatorios/resumo-financeiro", {
        params: {
          periodoInicio: dataInicioPag,
          periodoFim: dataFimPag,
        },
      });
      setPagamentos(normalizeResumoFinanceiroFromApi(r.data));
    } catch (e: unknown) {
      setErro(getRelatorioErrorMessage(e, "Falha ao carregar pagamentos recebidos"));
      setPagamentos(null);
    } finally {
      setLoadingPagamentos(false);
    }
  }

  useEffect(() => {
    if (aba === "pagamentos") carregarPagamentos();
  }, [aba, dataInicioPag, dataFimPag]);

  async function carregarAging() {
    setErro(null);
    setLoadingAging(true);
    try {
      const r = await api.get("/api/relatorios/aging");
      setAging(normalizeAgingResponse(r.data));
    } catch (e: unknown) {
      setErro(getRelatorioErrorMessage(e, "Falha ao carregar aging"));
      setAging(null);
    } finally {
      setLoadingAging(false);
    }
  }

  useEffect(() => {
    if (aba === "aging") carregarAging();
  }, [aba]);

  async function carregarEfetividade() {
    setErro(null);
    setLoadingEfetividade(true);
    try {
      const r = await api.get<EfetividadeCobrancaRelatorio>(
        `/api/relatorios/efetividade-cobranca?mes=${mesEfetividade}`
      );
      setEfetividade(r.data);
    } catch (e: unknown) {
      setErro(getRelatorioErrorMessage(e, "Falha ao carregar efetividade"));
      setEfetividade(null);
    } finally {
      setLoadingEfetividade(false);
    }
  }

  useEffect(() => {
    if (aba === "efetividade") carregarEfetividade();
  }, [aba, mesEfetividade]);

  const exportarRankingExcel = () => {
    const cabecalhos = ["Posição", "Cliente", "CPF/CNPJ", "Valor Devido", "Qtd. Dívidas", "Dias Atraso (média)", "Status"];
    const linhas = ranking.map((r) => [
      String(r.posicao),
      r.clienteNome,
      r.cpfCnpj,
      String(r.valorDevido),
      String(r.qtdDividas),
      String(r.mediaDiasAtraso),
      r.status,
    ]);
    exportarCSV("ranking-devedores", cabecalhos, linhas);
  };

  const exportarInadimplenciaExcel = () => {
    if (!inadPeriodo) return;
    const cabecalhos = ["Cliente", "CPF/CNPJ", "Qtd. Dívidas", "Valor Total", "Status Pior"];
    const linhas = inadPeriodo.detalhamento.map((d) => [
      d.clienteNome,
      d.cpfCnpj,
      String(d.qtdDividas),
      String(d.valorTotal),
      d.statusPior,
    ]);
    exportarCSV("inadimplencia-periodo", cabecalhos, linhas);
  };

  const exportarPagamentosExcel = () => {
    if (!pagamentos) return;
    const cabecalhos = ["Período início", "Período fim", "Total recebido"];
    const linhas = [[
      pagamentos.periodoInicio ?? dataInicioPag,
      pagamentos.periodoFim ?? dataFimPag,
      String(pagamentos.totalRecebido),
    ]];
    exportarCSV("resumo-financeiro", cabecalhos, linhas);
  };

  const exportarAgingExcel = () => {
    if (!aging) return;
    const cabecalhos = ["Faixa", "Qtd. Dívidas", "Valor Total", "%"];
    const linhas = aging.faixas.map((f) => [
      f.faixa,
      String(f.qtdDividas),
      String(f.valorTotal),
      formatarPercentual(f.percentual),
    ]);
    exportarCSV("aging", cabecalhos, linhas);
  };

  function gerarRelatorioPdf(dados: DadosRelatorioPdf) {
    try {
      exportarRelatorioPdf(dados);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Não foi possível gerar o PDF.");
    }
  }

  const statusChip = (status: RankingDevedorItem["status"]) => {
    const conf = status === "Crítico" ? { color: "error" as const, label: "Crítico" }
      : status === "Atenção" ? { color: "warning" as const, label: "Atenção" }
      : { color: "success" as const, label: "Recente" };
    return <Chip size="small" color={conf.color} label={conf.label} />;
  };

  return (
    <Box className="page-relatorios" sx={{ maxWidth: "100%", pb: 3 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
        Gestão de Inadimplentes
      </Typography>
      <Typography variant="h1" sx={{ fontSize: "1.5rem", fontWeight: 700, mb: 2 }}>
        Relatórios
      </Typography>

      <Tabs value={aba} onChange={(_, v) => setAba(v as AbaId)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        {ABAS.map((tab) => (
          <Tab key={tab.id} label={tab.label} value={tab.id} />
        ))}
      </Tabs>

      {erro && (
        <Alert severity="error" onClose={() => setErro(null)} sx={{ mb: 2 }}>
          {erro}
        </Alert>
      )}

      <Box>
        {aba === "ranking" && (
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} flexWrap="wrap" useFlexGap>
              <TextField select SelectProps={{ native: true }} label="Período" size="small" sx={{ minWidth: 160 }} value={filtroPeriodo} onChange={(e) => setFiltroPeriodo(e.target.value)}>
                <option value="semana">Última semana</option>
                <option value="mes">Último mês</option>
                <option value="trimestre">Trimestre</option>
                <option value="ano">Ano</option>
              </TextField>
              <TextField select SelectProps={{ native: true }} label="Limite" size="small" sx={{ minWidth: 120 }} value={filtroLimit} onChange={(e) => setFiltroLimit(Number(e.target.value))}>
                <option value={10}>Top 10</option>
                <option value={20}>Top 20</option>
              </TextField>
              <TextField type="number" label="Valor mínimo" size="small" placeholder="Opcional" sx={{ minWidth: 140 }} value={filtroValorMin} onChange={(e) => setFiltroValorMin(e.target.value)} />
              <TextField type="number" label="Qtd. dívidas mín." size="small" placeholder="Opcional" sx={{ minWidth: 140 }} value={filtroQtdDividas} onChange={(e) => setFiltroQtdDividas(e.target.value)} />
              <TextField type="number" label="Dias atraso mín." size="small" placeholder="Opcional" sx={{ minWidth: 140 }} value={filtroDiasAtraso} onChange={(e) => setFiltroDiasAtraso(e.target.value)} />
            </Stack>
            <Card elevation={1}>
              <CardHeader title="Ranking de Maiores Devedores" titleTypographyProps={{ variant: "h2", fontSize: "1.125rem" }} />
              <CardContent sx={{ pt: 0 }}>
                {loadingRanking ? (
                  <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Posição</strong></TableCell>
                          <TableCell><strong>Cliente</strong></TableCell>
                          <TableCell><strong>CPF/CNPJ</strong></TableCell>
                          <TableCell align="right"><strong>Valor Devido</strong></TableCell>
                          <TableCell align="center"><strong>Qtd. Dívidas</strong></TableCell>
                          <TableCell align="center"><strong>Dias Atraso (média)</strong></TableCell>
                          <TableCell><strong>Status</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {ranking.map((r) => (
                          <TableRow key={r.clienteId} hover>
                            <TableCell>{r.posicao}</TableCell>
                            <TableCell>{r.clienteNome}</TableCell>
                            <TableCell>{r.cpfCnpj}</TableCell>
                            <TableCell align="right">{formatarMoeda(r.valorDevido)}</TableCell>
                            <TableCell align="center">{r.qtdDividas}</TableCell>
                            <TableCell align="center">{r.mediaDiasAtraso} dias</TableCell>
                            <TableCell>{statusChip(r.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
            <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
              <Button variant="contained" startIcon={<DownloadIcon />} onClick={() => gerarRelatorioPdf({ aba: "ranking", ranking, filtroPeriodo, filtroLimit })}>
                Gerar relatório
              </Button>
              <Button variant="contained" startIcon={<ExcelIcon />} onClick={exportarRankingExcel}>
                Exportar Excel
              </Button>
            </Stack>
          </Stack>
        )}

        {aba === "extrato" && (
          <Stack spacing={2}>
            <Autocomplete<Cliente, false, false, false>
              size="small"
              sx={{ maxWidth: 480, width: "100%" }}
              options={clientes}
              value={clientes.find((c) => c.id != null && String(c.id) === clienteExtratoId) ?? null}
              onChange={(_, c) => setClienteExtratoId(c?.id != null ? String(c.id) : "")}
              getOptionLabel={(c) => c.nome}
              isOptionEqualToValue={(a, b) => String(a.id ?? "") === String(b.id ?? "")}
              filterOptions={createFilterOptions<Cliente>({
                stringify: (c) => [c.nome, c.cpf, c.email, c.telefone].filter(Boolean).join(" "),
              })}
              loading={loadingClientes}
              disabled={loadingClientes}
              noOptionsText="Nenhum cliente encontrado"
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Cliente"
                  placeholder="Digite o nome, CPF, e-mail ou telefone"
                  InputLabelProps={{ ...params.InputLabelProps, shrink: true }}
                />
              )}
              ListboxProps={{ style: { maxHeight: 280 } }}
            />
            {loadingExtrato && <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>}
            {extrato && !loadingExtrato && (
              <>
                <Card elevation={1}><CardHeader title="A) Dados do Cliente" titleTypographyProps={{ variant: "h2", fontSize: "1.125rem" }} /><CardContent sx={{ pt: 0 }}><Stack spacing={0.5}><Typography><strong>Nome:</strong> {extrato.cliente.nome}</Typography><Typography><strong>CPF:</strong> {extrato.cliente.cpfCnpj}</Typography><Typography><strong>Telefone:</strong> {extrato.cliente.telefone ?? "—"}</Typography><Typography><strong>Email:</strong> {extrato.cliente.email ?? "—"}</Typography><Typography><strong>Status:</strong> {extrato.cliente.status}</Typography><Typography><strong>Saldo Devedor Total:</strong> {formatarMoeda(extrato.cliente.saldoDevedorTotal)}</Typography></Stack></CardContent></Card>
                <Card elevation={1}><CardHeader title="B) Dívidas Ativas" titleTypographyProps={{ variant: "h2", fontSize: "1.125rem" }} /><CardContent sx={{ pt: 0 }}><TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}><Table size="small" stickyHeader><TableHead><TableRow><TableCell><strong>Protocolo</strong></TableCell><TableCell><strong>Descrição</strong></TableCell><TableCell><strong>Vencimento</strong></TableCell><TableCell align="right"><strong>Valor Original</strong></TableCell><TableCell align="right"><strong>Valor Devido</strong></TableCell><TableCell><strong>Status</strong></TableCell><TableCell align="center"><strong>Dias Atraso</strong></TableCell></TableRow></TableHead><TableBody>{extrato.dividasAtivas.map((d) => (<TableRow key={d.id} hover><TableCell>{d.protocolo}</TableCell><TableCell>{d.descricao}</TableCell><TableCell>{formatarData(d.vencimento)}</TableCell><TableCell align="right">{formatarMoeda(d.valorOriginal)}</TableCell><TableCell align="right">{formatarMoeda(d.valorDevido)}</TableCell><TableCell>{d.status}</TableCell><TableCell align="center">{d.diasAtraso}</TableCell></TableRow>))}</TableBody></Table></TableContainer></CardContent></Card>
                <Card elevation={1}><CardHeader title="C) Histórico de Pagamentos" titleTypographyProps={{ variant: "h2", fontSize: "1.125rem" }} /><CardContent sx={{ pt: 0 }}><TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}><Table size="small" stickyHeader><TableHead><TableRow><TableCell><strong>Data</strong></TableCell><TableCell><strong>Protocolo</strong></TableCell><TableCell align="right"><strong>Valor Pago</strong></TableCell><TableCell><strong>Método</strong></TableCell><TableCell align="right"><strong>Saldo Após</strong></TableCell></TableRow></TableHead><TableBody>{extrato.historicoPagamentos.map((p, i) => (<TableRow key={i} hover><TableCell>{formatarData(p.data)}</TableCell><TableCell>{p.protocolo}</TableCell><TableCell align="right">{formatarMoeda(p.valorPago)}</TableCell><TableCell>{p.metodo}</TableCell><TableCell align="right">{formatarMoeda(p.saldoApos)}</TableCell></TableRow>))}</TableBody></Table></TableContainer></CardContent></Card>
                <Card elevation={1}><CardHeader title="D) Notificações Enviadas" titleTypographyProps={{ variant: "h2", fontSize: "1.125rem" }} /><CardContent sx={{ pt: 0 }}><TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}><Table size="small" stickyHeader><TableHead><TableRow><TableCell><strong>Data</strong></TableCell><TableCell><strong>Tipo</strong></TableCell><TableCell><strong>Status</strong></TableCell><TableCell align="center"><strong>Tentativas</strong></TableCell></TableRow></TableHead><TableBody>{extrato.notificacoes.map((n, i) => (<TableRow key={i} hover><TableCell>{formatarData(n.data)}</TableCell><TableCell>{n.tipo}</TableCell><TableCell>{n.status}</TableCell><TableCell align="center">{n.tentativas}</TableCell></TableRow>))}</TableBody></Table></TableContainer></CardContent></Card>
                <Stack direction="row" justifyContent="center"><Button variant="contained" startIcon={<DownloadIcon />} onClick={() => gerarRelatorioPdf({ aba: "extrato", extrato: extrato ?? undefined })}>Gerar relatório</Button></Stack>
              </>
            )}
          </Stack>
        )}

        {aba === "inadimplencia" && (
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField type="date" label="Data início" size="small" InputLabelProps={{ shrink: true }} value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
              <TextField type="date" label="Data fim" size="small" InputLabelProps={{ shrink: true }} value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </Stack>
            {loadingInadPeriodo && <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>}
            {inadPeriodo && !loadingInadPeriodo && (
              <>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} flexWrap="wrap" useFlexGap>
                  <Card variant="outlined" sx={{ flex: "1 1 200px", minWidth: 0 }}><CardContent><Typography variant="body2" color="text.secondary">Período</Typography><Typography fontWeight={600}>{formatarData(inadPeriodo.dataInicio)} a {formatarData(inadPeriodo.dataFim)}</Typography></CardContent></Card>
                  <Card variant="outlined" sx={{ flex: "1 1 200px", minWidth: 0 }}><CardContent><Typography variant="body2" color="text.secondary">Total de clientes com dívidas</Typography><Typography fontWeight={600}>{inadPeriodo.totalClientes}</Typography></CardContent></Card>
                  <Card variant="outlined" sx={{ flex: "1 1 200px", minWidth: 0 }}><CardContent><Typography variant="body2" color="text.secondary">Valor total</Typography><Typography fontWeight={600}>{formatarMoeda(inadPeriodo.valorTotal)}</Typography></CardContent></Card>
                  <Card variant="outlined" sx={{ flex: "1 1 200px", minWidth: 0 }}><CardContent><Typography variant="body2" color="text.secondary">Dívidas vencidas no período</Typography><Typography fontWeight={600}>{inadPeriodo.dividasVencidasNoPeriodo} ({formatarMoeda(inadPeriodo.valorVencidoNoPeriodo)})</Typography></CardContent></Card>
                </Stack>
                <Card elevation={1}><CardHeader title="Detalhamento" titleTypographyProps={{ variant: "h2", fontSize: "1.125rem" }} /><CardContent sx={{ pt: 0 }}><TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}><Table size="small" stickyHeader><TableHead><TableRow><TableCell><strong>Cliente</strong></TableCell><TableCell><strong>CPF/CNPJ</strong></TableCell><TableCell align="center"><strong>Qtd. Dívidas</strong></TableCell><TableCell align="right"><strong>Valor Total</strong></TableCell><TableCell><strong>Status Pior</strong></TableCell></TableRow></TableHead><TableBody>{inadPeriodo.detalhamento.map((d) => (<TableRow key={d.clienteId} hover><TableCell>{d.clienteNome}</TableCell><TableCell>{d.cpfCnpj}</TableCell><TableCell align="center">{d.qtdDividas}</TableCell><TableCell align="right">{formatarMoeda(d.valorTotal)}</TableCell><TableCell>{d.statusPior}</TableCell></TableRow>))}</TableBody></Table></TableContainer></CardContent></Card>
                <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap"><Button variant="contained" startIcon={<DownloadIcon />} onClick={() => gerarRelatorioPdf({ aba: "inadimplencia", inadPeriodo: inadPeriodo ?? undefined, dataInicio, dataFim })}>Gerar relatório</Button><Button variant="contained" startIcon={<ExcelIcon />} onClick={exportarInadimplenciaExcel}>Exportar Excel</Button></Stack>
              </>
            )}
          </Stack>
        )}

        {aba === "pagamentos" && (
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField type="date" label="Data início" size="small" InputLabelProps={{ shrink: true }} value={dataInicioPag} onChange={(e) => setDataInicioPag(e.target.value)} />
              <TextField type="date" label="Data fim" size="small" InputLabelProps={{ shrink: true }} value={dataFimPag} onChange={(e) => setDataFimPag(e.target.value)} />
            </Stack>
            {loadingPagamentos && <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>}
            {pagamentos && !loadingPagamentos && (
              <>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} flexWrap="wrap" useFlexGap>
                  <Card variant="outlined" sx={{ flex: "1 1 200px", minWidth: 0 }}><CardContent><Typography variant="body2" color="text.secondary">Período</Typography><Typography fontWeight={600}>{formatarData(pagamentos.periodoInicio ?? dataInicioPag)} a {formatarData(pagamentos.periodoFim ?? dataFimPag)}</Typography></CardContent></Card>
                  <Card variant="outlined" sx={{ flex: "1 1 200px", minWidth: 0 }}><CardContent><Typography variant="body2" color="text.secondary">Valor total recebido</Typography><Typography fontWeight={600}>{formatarMoeda(pagamentos.totalRecebido)}</Typography></CardContent></Card>
                </Stack>
                <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap"><Button variant="contained" startIcon={<DownloadIcon />} onClick={() => gerarRelatorioPdf({ aba: "pagamentos", pagamentos: pagamentos ?? undefined, dataInicioPag, dataFimPag })}>Gerar relatório</Button><Button variant="contained" startIcon={<ExcelIcon />} onClick={exportarPagamentosExcel}>Exportar Excel</Button></Stack>
              </>
            )}
          </Stack>
        )}

        {aba === "aging" && (
          <Stack spacing={2}>
            {loadingAging && <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>}
            {aging && !loadingAging && (
              <>
                <Card elevation={1}><CardHeader title="Análise de Aging (Envelhecimento da Dívida)" titleTypographyProps={{ variant: "h2", fontSize: "1.125rem" }} /><CardContent sx={{ pt: 0 }}><TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}><Table size="small" stickyHeader><TableHead><TableRow><TableCell><strong>Faixa</strong></TableCell><TableCell align="center"><strong>Qtd. Dívidas</strong></TableCell><TableCell align="right"><strong>Valor Total</strong></TableCell><TableCell align="right"><strong>% do Total</strong></TableCell></TableRow></TableHead><TableBody>{aging.faixas.map((f) => (<TableRow key={f.faixa} hover><TableCell>{f.faixa}</TableCell><TableCell align="center">{f.qtdDividas}</TableCell><TableCell align="right">{formatarMoeda(f.valorTotal)}</TableCell><TableCell align="right">{formatarPercentual(f.percentual)}</TableCell></TableRow>))}</TableBody></Table></TableContainer><Typography sx={{ mt: 2, fontWeight: 600 }}>Valor total geral: {formatarMoeda(aging.valorTotalGeral)}</Typography></CardContent></Card>
                <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap"><Button variant="contained" startIcon={<DownloadIcon />} onClick={() => gerarRelatorioPdf({ aba: "aging", aging: aging ?? undefined })}>Gerar relatório</Button><Button variant="contained" startIcon={<ExcelIcon />} onClick={exportarAgingExcel}>Exportar Excel</Button></Stack>
              </>
            )}
          </Stack>
        )}

        {aba === "efetividade" && (
          <Stack spacing={2}>
            <TextField type="month" label="Mês" size="small" InputLabelProps={{ shrink: true }} value={mesEfetividade} onChange={(e) => setMesEfetividade(e.target.value)} sx={{ maxWidth: 220 }} />
            {loadingEfetividade && <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>}
            {efetividade && !loadingEfetividade && (
              <>
                <Card elevation={1}><CardHeader title={`Efetividade de Cobrança — ${efetividade.periodo}`} titleTypographyProps={{ variant: "h2", fontSize: "1.125rem" }} /><CardContent sx={{ pt: 0 }}><Stack spacing={1.5}><Typography>📧 Notificações enviadas: <strong>{efetividade.totalNotificacoes}</strong></Typography><Typography>✅ Emails entregues: <strong>{efetividade.emailsEntregues}</strong> ({formatarPercentual(efetividade.taxaEntrega)})</Typography><Typography>❌ Falhas: <strong>{efetividade.falhas}</strong></Typography><Typography>💰 Cobranças que resultaram em pagamento: <strong>{efetividade.cobrancasComPagamento}</strong> ({efetividade.taxaConversao}%)</Typography><Typography>⏱ Tempo médio entre cobrança e pagamento: <strong>{efetividade.tempoMedioDias}</strong> dias</Typography>{efetividade.comparativoAnterior && (<Typography>📊 Comparativo: {efetividade.comparativoAnterior.periodo} {efetividade.comparativoAnterior.taxaConversao}% → este mês {efetividade.taxaConversao}% ({efetividade.comparativoAnterior.variacaoPp >= 0 ? "+" : ""}{efetividade.comparativoAnterior.variacaoPp}pp) ✅</Typography>)}</Stack></CardContent></Card>
                <Stack direction="row" justifyContent="center"><Button variant="contained" startIcon={<DownloadIcon />} onClick={() => gerarRelatorioPdf({ aba: "efetividade", efetividade: efetividade ?? undefined, mesEfetividade })}>Gerar relatório</Button></Stack>
              </>
            )}
          </Stack>
        )}
      </Box>
    </Box>
  );
}

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function ExcelIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M8 13h2m4 0h2m-8 4h2m4 0h2m-8 4h2m4 0h2" />
    </svg>
  );
}
