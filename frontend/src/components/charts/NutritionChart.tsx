import { useState } from 'react'
import {
  ComposedChart, Line, ReferenceLine, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import type { DayHistory } from '../../types'

const NHS_TARGETS = {
  male:   { calories: 2500, protein: 55, carbs: 300, fat: 97, fibre: 30 },
  female: { calories: 2000, protein: 45, carbs: 260, fat: 78, fibre: 30 },
}

type Nutrient = 'calories' | 'protein' | 'carbs' | 'fat' | 'fibre'
type ViewMode = 'daily' | 'weekly'

const NUTRIENT_LABELS: Record<Nutrient, string> = {
  calories: 'Calories (kcal)',
  protein: 'Protein (g)',
  carbs: 'Carbs (g)',
  fat: 'Fat (g)',
  fibre: 'Fibre (g)',
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function avg(nums: number[]): number {
  const nonZero = nums.filter(n => n > 0)
  if (nonZero.length === 0) return 0
  return Math.round(nonZero.reduce((a, b) => a + b, 0) / nonZero.length * 10) / 10
}

function toWeekly(days: DayHistory[], nutrient: Nutrient) {
  const chunks: DayHistory[][] = []
  for (let i = 0; i < days.length; i += 7) chunks.push(days.slice(i, i + 7))
  return chunks.map(week => ({
    label: `w/c ${fmtDate(week[0].date)}`,
    value: avg(week.map(d => d[nutrient])),
  }))
}

function toDaily(days: DayHistory[], nutrient: Nutrient) {
  return days.map(d => ({ label: fmtDate(d.date), value: d[nutrient] }))
}

interface Props {
  days: DayHistory[]
  sex: 'male' | 'female'
}

export default function NutritionChart({ days, sex }: Props) {
  const [nutrient, setNutrient] = useState<Nutrient>('calories')
  const [viewMode, setViewMode] = useState<ViewMode>('daily')

  const target = NHS_TARGETS[sex][nutrient]
  const data = viewMode === 'daily' ? toDaily(days, nutrient) : toWeekly(days, nutrient)

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>Nutrition over time</h3>
        <div className="chart-controls">
          <div className="toggle-group">
            {(['daily', 'weekly'] as ViewMode[]).map(m => (
              <button
                key={m}
                className={`toggle-btn ${viewMode === m ? 'active' : ''}`}
                onClick={() => setViewMode(m)}
              >
                {m === 'daily' ? 'Daily' : 'Weekly avg'}
              </button>
            ))}
          </div>
          <select
            className="nutrient-select"
            value={nutrient}
            onChange={e => setNutrient(e.target.value as Nutrient)}
          >
            {(Object.keys(NUTRIENT_LABELS) as Nutrient[]).map(n => (
              <option key={n} value={n}>{NUTRIENT_LABELS[n]}</option>
            ))}
          </select>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
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
            width={40}
          />
          <Tooltip
            contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: 'var(--text-muted)' }}
            itemStyle={{ color: 'var(--text)' }}
            formatter={(v: number) => [v, NUTRIENT_LABELS[nutrient]]}
          />
          <ReferenceLine
            y={target}
            stroke="var(--accent2)"
            strokeDasharray="5 3"
            label={{ value: `NHS: ${target}`, fill: 'var(--accent2)', fontSize: 10, position: 'insideTopRight' }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={{ r: 3, fill: 'var(--accent)', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            name={NUTRIENT_LABELS[nutrient]}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
