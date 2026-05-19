import {
  ComposedChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import type { DayHistory } from '../../types'

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function kgToStoneStr(kg: number): string {
  const totalLbs = kg / 0.453592
  const stones = Math.floor(totalLbs / 14)
  const lbs = Math.round(totalLbs % 14)
  return `${stones} st ${lbs} lbs`
}

interface Props {
  days: DayHistory[]
}

interface TooltipPayload {
  value: number
  name: string
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) {
  if (!active || !payload?.length) return null
  const kg = payload[0].value
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ color: 'var(--text)' }}>{kg.toFixed(1)} kg</div>
      <div style={{ color: 'var(--text-muted)' }}>{kgToStoneStr(kg)}</div>
    </div>
  )
}

export default function WeightChart({ days }: Props) {
  // Only include days with a weight reading; carry-forward for the line
  const daysWithWeight = days.filter(d => d.weight_kg != null)
  const hasData = daysWithWeight.length > 0

  const chartData = daysWithWeight.map(d => ({
    label: fmtDate(d.date),
    weight: d.weight_kg as number,
  }))

  const weights = chartData.map(d => d.weight)
  const minW = Math.floor(Math.min(...weights) - 1)
  const maxW = Math.ceil(Math.max(...weights) + 1)

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>Weight over time</h3>
        <span className="chart-subtitle">kg · hover for stone/lbs</span>
      </div>

      {!hasData ? (
        <div className="chart-empty">No weight logged in this period</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[minW, maxW]}
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              unit=" kg"
              width={52}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="var(--accent)"
              strokeWidth={2}
              dot={{ fill: 'var(--accent)', r: 3 }}
              activeDot={{ r: 5 }}
              name="Weight"
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
