import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api, isMockEnabled, normalizeListResponse } from '@/lib/api'
import { normalizeInadimplenciaFromApi, normalizeResumoRelatorioFromApi } from '@/lib/apiNormalizers'
import { DASHBOARD_INVALIDATE_EVENT } from '@/lib/dashboardRefresh'
import type { Inadimplencia, ResumoRelatorio } from '@/types/api'
import { DonutChart } from '@/components/DonutChart'

function formatarData(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

type PeriodoChart = 30 | 60 | 90

export default function Dashboard() {
  const location = useLocation()
  const navigate = useNavigate()
  const [resumo, setResumo] = useState<ResumoRelatorio | null>(null)
  const [loading, setLoading] = useState(true)
  const [periodoChart, setPeriodoChart] = useState<PeriodoChart>(30)
  const [resumoChart, setResumoChart] = useState<ResumoRelatorio | null>(null)
  const [loadingChart, setLoadingChart] = useState(true)
  const [ultimasAtividades, setUltimasAtividades] = useState<Inadimplencia[]>([])
  const [loadingAtividades, setLoadingAtividades] = useState(true)

  /** Cache-bust para forçar resposta nova do servidor (evita cache do navegador/axios) */
  const cacheBust = () => `_t=${Date.now()}`

  /** Refetch de todos os dados do dashboard (resumo, gráfico, atividades) */
  const refetchDashboard = useCallback((diasChart: PeriodoChart) => {
    setLoading(true)
    setLoadingChart(true)
    setLoadingAtividades(true)
    api.get<ResumoRelatorio>(`/api/relatorios/resumo?${cacheBust()}`).then((r) => setResumo(normalizeResumoRelatorioFromApi(r.data))).catch(() => setResumo(null)).finally(() => setLoading(false))
    api.get<ResumoRelatorio>(`/api/relatorios/resumo?dias=${diasChart}&${cacheBust()}`).then((r) => setResumoChart(normalizeResumoRelatorioFromApi(r.data))).catch(() => setResumoChart(null)).finally(() => setLoadingChart(false))
    api.get(`/api/inadimplentes?${cacheBust()}`, { params: { paginado: false } })
      .then((r) => {
        const raw = normalizeListResponse<Record<string, unknown>>(r.data)
        const lista: Inadimplencia[] = isMockEnabled() ? (raw as Inadimplencia[]) : raw.map((item) => normalizeInadimplenciaFromApi(item))
        const ordenadas = [...lista].sort((a, b) => {
          const cmpVenc = (b.vencimento || '').localeCompare(a.vencimento || '')
          return cmpVenc !== 0 ? cmpVenc : (b.id ?? '').localeCompare(a.id ?? '')
        })
        setUltimasAtividades(ordenadas.slice(0, 10))
      })
      .catch(() => setUltimasAtividades([]))
      .finally(() => setLoadingAtividades(false))
  }, [])

  /** Recarrega todos os dados ao abrir/voltar para o dashboard (sem usar cache antigo) */
  useEffect(() => {
    if (location.pathname !== '/dashboard') return
    const t = cacheBust()
    setLoading(true)
    setLoadingChart(true)
    setLoadingAtividades(true)
    api.get<ResumoRelatorio>(`/api/relatorios/resumo?${t}`).then((r) => setResumo(normalizeResumoRelatorioFromApi(r.data))).catch(() => setResumo(null)).finally(() => setLoading(false))
    api.get<ResumoRelatorio>(`/api/relatorios/resumo?dias=${periodoChart}&${t}`).then((r) => setResumoChart(normalizeResumoRelatorioFromApi(r.data))).catch(() => setResumoChart(null)).finally(() => setLoadingChart(false))
    api.get(`/api/inadimplentes?${t}`, { params: { paginado: false } })
      .then((r) => {
        const raw = normalizeListResponse<Record<string, unknown>>(r.data)
        const lista: Inadimplencia[] = isMockEnabled() ? (raw as Inadimplencia[]) : raw.map((item) => normalizeInadimplenciaFromApi(item))
        const ordenadas = [...lista].sort((a, b) => {
          const vA = a.vencimento || ''
          const vB = b.vencimento || ''
          const cmpVenc = vB.localeCompare(vA)
          if (cmpVenc !== 0) return cmpVenc
          return (b.id ?? '').localeCompare(a.id ?? '')
        })
        setUltimasAtividades(ordenadas.slice(0, 10))
      })
      .catch(() => setUltimasAtividades([]))
      .finally(() => setLoadingAtividades(false))
  }, [location.pathname, periodoChart])

  /** Ao receber evento de invalidação (criar/cancelar/confirmar inadimplência), refaz as requisições */
  useEffect(() => {
    if (location.pathname !== '/dashboard') return
    const handler = () => refetchDashboard(periodoChart)
    window.addEventListener(DASHBOARD_INVALIDATE_EVENT, handler)
    return () => window.removeEventListener(DASHBOARD_INVALIDATE_EVENT, handler)
  }, [location.pathname, periodoChart, refetchDashboard])

  /** Ao voltar para a aba (ex.: fez ação em outra aba), refaz o fetch para não exibir dados antigos */
  useEffect(() => {
    if (location.pathname !== '/dashboard') return
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refetchDashboard(periodoChart)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [location.pathname, periodoChart, refetchDashboard])

  const totalClientes = resumo?.totalClientes ?? 0
  const totalInadimplentes = resumo?.totalDividas ?? 0
  const valorEmAberto = resumo?.totalEmAberto ?? 0

  return (
    <div className="dashboard">
      <div className="dashboard-header-row">
        <div>
          <h1 className="dashboard-title">Visão geral do sistema de gestão de inadimplentes</h1>
          <p className="dashboard-subtitle">Bem-vindo ao seu painel de controle.</p>
        </div>
        <button
          type="button"
          className="btn btn--secondary dashboard-btn-atualizar"
          onClick={() => refetchDashboard(periodoChart)}
          disabled={loading}
          title="Buscar dados atualizados do servidor"
        >
          {loading ? 'Atualizando…' : 'Atualizar'}
        </button>
      </div>

      <div className="dashboard-cards">
        <div className="dashboard-card">
          <div className="dashboard-card__icon dashboard-card__icon--people">
            <PeopleIcon />
          </div>
          <div className="dashboard-card__content">
            <span className="dashboard-card__label">Clientes</span>
            {loading ? (
              <span className="dashboard-card__value">—</span>
            ) : (
              <span className="dashboard-card__value">{totalClientes.toLocaleString('pt-BR')}</span>
            )}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card__icon dashboard-card__icon--chart">
            <ChartLineIcon />
          </div>
          <div className="dashboard-card__content">
            <span className="dashboard-card__label">Total de inadimplentes</span>
            {loading ? (
              <span className="dashboard-card__value">—</span>
            ) : (
              <span className="dashboard-card__value">{totalInadimplentes}</span>
            )}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card__icon dashboard-card__icon--money">
            <MoneyIcon />
          </div>
          <div className="dashboard-card__content">
            <span className="dashboard-card__label">Valor total em aberto</span>
            {loading ? (
              <span className="dashboard-card__value">—</span>
            ) : (
              <span className="dashboard-card__value">
                {valorEmAberto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            )}
          </div>
        </div>
      </div>

      <section className="dashboard-section dashboard-chart-section">
        <div className="dashboard-chart-header">
          <h2 className="dashboard-section__title">Montante a receber</h2>
          <div className="dashboard-chart-filtros">
            {([30, 60, 90] as const).map((d) => (
              <button
                key={d}
                type="button"
                className={`dashboard-chart-filtro ${periodoChart === d ? 'dashboard-chart-filtro--ativo' : ''}`}
                onClick={() => setPeriodoChart(d)}
              >
                {d} dias
              </button>
            ))}
          </div>
        </div>
        <div className="dashboard-chart">
          {loadingChart ? (
            <div className="dashboard-chart__loading">Carregando...</div>
          ) : (
            <div className="dashboard-chart__donut">
              <DonutChart
                totalEmAberto={resumoChart?.totalEmAberto ?? 0}
                totalPago={resumoChart?.totalPago ?? 0}
              />
            </div>
          )}
        </div>
      </section>

      <section className="dashboard-section">
        <h2 className="dashboard-section__title">Ações Rápidas</h2>
        <div className="dashboard-actions">
          <button type="button" className="btn btn--primary" onClick={() => navigate('/clientes')}>
            <PlusIcon />
            Cadastrar Novo Cliente
          </button>
          <button type="button" className="btn btn--secondary" onClick={() => navigate('/relatorios')}>
            <DocIcon />
            Visualizar Relatórios
          </button>
        </div>
      </section>

      <section className="dashboard-section">
        <h2 className="dashboard-section__title">Últimas Atividades</h2>
        <ul className="dashboard-activities">
          {loadingAtividades ? (
            <li className="dashboard-activity dashboard-activity--vazio">Carregando...</li>
          ) : ultimasAtividades.length === 0 ? (
            <li className="dashboard-activity dashboard-activity--vazio">
              Nenhuma atividade recente. Cadastre clientes e inadimplências para ver aqui.
            </li>
          ) : (
            ultimasAtividades.map((item) => (
              <li key={item.id ?? `${item.clienteId}-${item.vencimento}-${item.valor}`} className="dashboard-activity">
                <div className="dashboard-activity__main">
                  <span className="dashboard-activity__nome">
                    {item.clienteNome ?? `Cliente #${item.clienteId}`}
                  </span>
                  <span className="dashboard-activity__desc">
                    {(item.status ?? 'EmAberto') === 'Pago' ? 'Pagamento confirmado' : 'Dívida em aberto'} · Venc.: {formatarData(item.vencimento)}
                  </span>
                </div>
                <div className="dashboard-activity__meta">
                  <span className="dashboard-activity__valor">
                    {(item.valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  )
}

function PeopleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function ChartLineIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

function MoneyIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function DocIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}
