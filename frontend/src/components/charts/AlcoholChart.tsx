import { useState } from 'react'
import {
  ComposedChart, Bar, Line, ReferenceLine, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import type { DayHistory } from '../../types'

// NHS recommends no more than 14 units per week, spread over 3+ days
const NHS_WEEKLY_LIMIT = 14
const NHS_DAILY_GUIDE = 2 // 14 / 7 as a daily reference

type ViewMode = 'daily' | 'weekly'

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function toDaily(days: DayHistory[]) {
  return days.map((d, i) => {
    const window = days.slice(Math.max(0, i - 6), i + 1)
    const ma = Math.round(window.reduce((sum, w) => sum + w.alcohol_units, 0) / window.length * 100) / 100
    return {
      label: fmtDate(d.date),
      value: d.alcohol_units,
      ma7: ma,
    }
  })
}

function toWeekly(days: DayHistory[]) {
  const chunks: DayHistory[][] = []
  for (let i = 0; i < days.length; i += 7) chunks.push(days.slice(i, i + 7))
  return chunks.map(week => ({
    label: `w/c ${fmtDate(week[0].date)}`,
    value: Math.round(week.reduce((sum, d) => sum + d.alcohol_units, 0) * 100) / 100,
  }))
}

interface Props {
  days: DayHistory[]
  sex: 'male' | 'female'
}

export default function AlcoholChart({ days, sex: _sex }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('weekly')

  const data = viewMode === 'daily' ? toDaily(days) : toWeekly(days)
  const hasData = days.some(d => d.alcohol_units > 0)

  const refValue = viewMode === 'daily' ? NHS_DAILY_GUIDE : NHS_WEEKLY_LIMIT
  const refLabel = viewMode === 'daily'
    ? `NHS guide: ${NHS_DAILY_GUIDE} units/day`
    : `NHS limit: ${NHS_WEEKLY_LIMIT} units/week`

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>Alcohol over time</h3>
        <div className="chart-controls">
          <div className="toggle-group">
            {(['daily', 'weekly'] as ViewMode[]).map(m => (
              <button
                key={m}
                className={`toggle-btn ${viewMode === m ? 'active' : ''}`}
                onClick={() => setViewMode(m)}
              >
                {m === 'daily' ? 'Daily' : 'Weekly total'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!hasData ? (
        <div className="chart-empty">No alcohol logged in this period</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              unit=" u"
              width={44}
            />
            <Tooltip
              contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: 'var(--text-muted)' }}
              itemStyle={{ color: 'var(--text)' }}
              formatter={(v: number, name: string) => [`${v} units`, name]}
            />
            {viewMode === 'daily' && (
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
            )}
            <ReferenceLine
              y={refValue}
              stroke="var(--accent2)"
              strokeDasharray="5 3"
              label={{ value: refLabel, fill: 'var(--accent2)', fontSize: 10, position: 'insideTopRight' }}
            />
            <Bar
              dataKey="value"
              fill="var(--accent)"
              fillOpacity={0.6}
              radius={[3, 3, 0, 0]}
              name="Daily units"
            />
            {viewMode === 'daily' && (
              <Line
                type="monotone"
                dataKey="ma7"
                stroke="#f5a623"
                strokeWidth={2}
                dot={false}
                name="7-day avg"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
