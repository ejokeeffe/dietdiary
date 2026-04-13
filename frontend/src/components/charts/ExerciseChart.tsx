import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import type { DayHistory } from '../../types'

const COLORS = ['#6c63ff', '#3ecf8e', '#f5a623', '#e05260', '#00bcd4', '#ff7043', '#ab47bc']

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

interface Props {
  days: DayHistory[]
}

export default function ExerciseChart({ days }: Props) {
  // Collect all unique exercise types across the period
  const allTypes = Array.from(
    new Set(days.flatMap(d => d.exercise_sessions.map(s => s.exercise_type)))
  )

  const hasData = days.some(d => d.exercise_sessions.length > 0)

  // Pivot: one row per day, one column per exercise type (duration in minutes)
  const chartData = days.map(d => {
    const row: Record<string, string | number> = { date: fmtDate(d.date) }
    allTypes.forEach(type => {
      row[type] = d.exercise_sessions
        .filter(s => s.exercise_type === type)
        .reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0)
    })
    return row
  })

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>Exercise over time</h3>
        <span className="chart-subtitle">Duration per session (minutes)</span>
      </div>

      {!hasData ? (
        <div className="chart-empty">No exercise logged in this period</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              unit=" min"
              width={48}
            />
            <Tooltip
              contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: 'var(--text-muted)' }}
              itemStyle={{ color: 'var(--text)' }}
              formatter={(v: number, name: string) => v > 0 ? [`${v} min`, name] : null}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }}
            />
            {allTypes.map((type, i) => (
              <Bar
                key={type}
                dataKey={type}
                stackId="ex"
                fill={COLORS[i % COLORS.length]}
                radius={i === allTypes.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
