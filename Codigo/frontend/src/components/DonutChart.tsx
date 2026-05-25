import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

const COLORS: Record<string, string> = {
  'A receber': '#9333ea',
  Recebido: '#64748b',
}

export type DonutChartItem = { name: string; value: number }

type DonutChartProps = {
  /** Valor a receber (primeira fatia) */
  totalEmAberto: number
  /** Valor já recebido (segunda fatia) */
  totalPago: number
}

export function DonutChart({ totalEmAberto, totalPago }: DonutChartProps) {
  const receber = Math.max(0, totalEmAberto)
  const pago = Math.max(0, totalPago)

  const data: DonutChartItem[] = [
    { name: 'A receber', value: receber },
    { name: 'Recebido', value: pago },
  ].filter((d) => d.value > 0)

  const temDados = data.length > 0
  const displayData = temDados ? data : [{ name: 'A receber', value: 1 }]
  const valorCentral = receber

  return (
    <div className="donut-chart">
      <div className="donut-chart__wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={displayData}
              cx="50%"
              cy="50%"
              innerRadius="65%"
              outerRadius="85%"
              paddingAngle={4}
              dataKey="value"
              stroke="none"
              animationBegin={0}
              animationDuration={1500}
            >
              {displayData.map((entry) => (
                <Cell
                  key={`cell-${entry.name}`}
                  fill={temDados ? COLORS[entry.name] : 'var(--chart-stroke-bg)'}
                  className="donut-chart__cell"
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-chart__center" aria-hidden="true">
          <span className="donut-chart__valor">
            {valorCentral.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
          <span className="donut-chart__label">a receber</span>
        </div>
      </div>
      <div className="donut-chart__legenda">
        <div className="donut-chart__legenda-item">
          <span className="donut-chart__legenda-bullet donut-chart__legenda-bullet--receber" />
          <span>
            A receber:{' '}
            <strong>
              {(totalEmAberto ?? 0).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </strong>
          </span>
        </div>
        <div className="donut-chart__legenda-item">
          <span className="donut-chart__legenda-bullet donut-chart__legenda-bullet--pago" />
          <span>
            Recebido:{' '}
            <strong>
              {(totalPago ?? 0).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </strong>
          </span>
        </div>
      </div>
    </div>
  )
}
