import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceArea,
} from 'recharts'
import type { DayHistory, HealthEvent } from '../../types'

const COLORS = ['#6c63ff', '#3ecf8e', '#f5a623', '#e05260', '#00bcd4', '#ff7043', '#ab47bc']

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const HEALTH_COLORS: Record<string, string> = {
  injury: '#f5a623',
  illness: '#9c6fe4',
}

interface Props {
  days: DayHistory[]
  healthEvents?: HealthEvent[]
}

export default function ExerciseChart({ days, healthEvents = [] }: Props) {
  // Collect all unique exercise types across the period
  const allTypes = Array.from(
    new Set(days.flatMap(d => d.exercise_sessions.map(s => s.exercise_type)))
  )

  const hasData = days.some(d => d.exercise_sessions.length > 0)

  // Map health events to chart x-axis ranges using the formatted date strings
  const healthAreas = healthEvents.map(event => {
    const end = event.end_date || event.start_date
    const daysInSpan = days.filter(d => d.date >= event.start_date && d.date <= end)
    if (daysInSpan.length === 0) return null
    return {
      x1: fmtDate(daysInSpan[0].date),
      x2: fmtDate(daysInSpan[daysInSpan.length - 1].date),
      color: HEALTH_COLORS[event.event_type] ?? '#999',
      label: event.description,
    }
  }).filter(Boolean) as { x1: string; x2: string; color: string; label: string }[]

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
            {healthAreas.map((area, i) => (
              <ReferenceArea
                key={i}
                x1={area.x1}
                x2={area.x2}
                fill={area.color}
                fillOpacity={0.12}
                stroke={area.color}
                strokeOpacity={0.3}
                strokeWidth={1}
              />
            ))}
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
