import type { DaySummary } from '../types'

// NHS recommended daily amounts — Eatwell Guide + alcohol guidelines
const NHS_TARGETS = {
  male: {
    calories: 2500,
    protein: 55,
    carbs: 300,
    fat: 97,
    fibre: 30,
    alcohol_weekly: 14,
  },
  female: {
    calories: 2000,
    protein: 45,
    carbs: 260,
    fat: 78,
    fibre: 30,
    alcohol_weekly: 14,
  },
}

interface StatProps {
  label: string
  value: number
  unit: string
  target: number
  targetLabel: string
  /** If true: going over target is bad (calories, fat, carbs). If false: reaching target is good (protein, fibre). */
  higherIsBad: boolean
}

function StatItem({ label, value, unit, target, targetLabel, higherIsBad }: StatProps) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0
  const over = value > target

  let barColor: string
  if (higherIsBad) {
    barColor = over ? 'var(--danger)' : pct >= 80 ? 'var(--warning)' : 'var(--accent2)'
  } else {
    barColor = pct >= 100 ? 'var(--accent2)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)'
  }

  return (
    <div className="summary-item">
      <span className="summary-label">{label}</span>
      <span className="summary-value" style={{ color: over && higherIsBad ? 'var(--danger)' : undefined }}>
        {value}{unit}
      </span>
      <div className="summary-bar-track">
        <div className="summary-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
      </div>
      <span className="summary-target">{targetLabel}</span>
    </div>
  )
}

interface Props {
  summary: DaySummary
  sex: 'male' | 'female'
}

export default function SummaryBar({ summary, sex }: Props) {
  const t = NHS_TARGETS[sex]

  return (
    <div className="summary-bar">
      <StatItem
        label="Calories"
        value={summary.total_calories_consumed}
        unit=" kcal"
        target={t.calories}
        targetLabel={`of ${t.calories} kcal`}
        higherIsBad={true}
      />
      <StatItem
        label="Protein"
        value={summary.total_protein}
        unit="g"
        target={t.protein}
        targetLabel={`of ${t.protein}g`}
        higherIsBad={false}
      />
      <StatItem
        label="Carbs"
        value={summary.total_carbs}
        unit="g"
        target={t.carbs}
        targetLabel={`of ${t.carbs}g`}
        higherIsBad={true}
      />
      <StatItem
        label="Fat"
        value={summary.total_fat}
        unit="g"
        target={t.fat}
        targetLabel={`of ${t.fat}g`}
        higherIsBad={true}
      />
      <StatItem
        label="Fibre"
        value={summary.total_fibre}
        unit="g"
        target={t.fibre}
        targetLabel={`of ${t.fibre}g`}
        higherIsBad={false}
      />
      {summary.total_alcohol_units > 0 && (
        <div className="summary-item">
          <span className="summary-label">Alcohol</span>
          <span
            className="summary-value"
            style={{ color: summary.total_alcohol_units > 2 ? 'var(--danger)' : 'var(--warning)' }}
          >
            {summary.total_alcohol_units} units
          </span>
          <div className="summary-bar-track">
            <div
              className="summary-bar-fill"
              style={{
                width: `${Math.min((summary.total_alcohol_units / 2) * 100, 100)}%`,
                background: summary.total_alcohol_units > 2 ? 'var(--danger)' : 'var(--warning)',
              }}
            />
          </div>
          <span className="summary-target">{t.alcohol_weekly} units/week</span>
        </div>
      )}
      {summary.total_calories_burned > 0 && (
        <div className="summary-item">
          <span className="summary-label">Burned</span>
          <span className="summary-value" style={{ color: 'var(--accent2)' }}>
            {summary.total_calories_burned} kcal
          </span>
        </div>
      )}
      <div className="summary-item">
        <span className="summary-label">Net</span>
        <span
          className="summary-value"
          style={{ color: summary.net_calories > t.calories ? 'var(--danger)' : 'var(--accent2)' }}
        >
          {summary.net_calories} kcal
        </span>
      </div>
    </div>
  )
}
