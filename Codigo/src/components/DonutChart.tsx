import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

const COLORS = ['#9333ea', '#64748b'] // Roxo vibrante e cinza visível (recebido)

export type DonutChartItem = { name: string; value: number }

type DonutChartProps = {
  /** Valor a receber (primeira fatia) */
  totalEmAberto: number
  /** Valor já recebido (segunda fatia) */
  totalPago: number
}

export function DonutChart({ totalEmAberto, totalPago }: DonutChartProps) {
  const data: DonutChartItem[] = [
    { name: 'A receber', value: Math.max(0, totalEmAberto) },
    { name: 'Recebido', value: Math.max(0, totalPago) },
  ].filter((d) => d.value > 0)

  // Se não houver dados, mostrar um anel vazio com um valor mínimo para exibir o círculo
  const displayData = data.length > 0 ? data : [{ name: 'A receber', value: 1 }]
  const valorCentral = totalEmAberto

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
              {displayData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={data.length > 0 ? COLORS[index % COLORS.length] : 'var(--chart-stroke-bg)'}
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
              maximumFractionDigits: 0,
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
              })}
            </strong>
          </span>
        </div>
      </div>
    </div>
  )
}
