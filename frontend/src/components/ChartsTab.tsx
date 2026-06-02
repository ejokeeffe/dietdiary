import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { DayHistory, HealthEvent } from '../types'
import NutritionChart from './charts/NutritionChart'
import ExerciseChart from './charts/ExerciseChart'
import AlcoholChart from './charts/AlcoholChart'
import WeightChart from './charts/WeightChart'
import HealthTimeline from './charts/HealthTimeline'

const RANGE_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
]

interface Props {
  profileId: number
  sex: 'male' | 'female'
}

export default function ChartsTab({ profileId, sex }: Props) {
  const [days, setDays] = useState<DayHistory[]>([])
  const [healthEvents, setHealthEvents] = useState<HealthEvent[]>([])
  const [range, setRange] = useState(30)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.getHistory(profileId, range)
      .then(r => { setDays(r.days); setHealthEvents(r.health_events) })
      .catch(() => { setDays([]); setHealthEvents([]) })
      .finally(() => setLoading(false))
  }, [profileId, range])

  return (
    <div className="charts-tab">
      <div className="charts-range-bar">
        {RANGE_OPTIONS.map(o => (
          <button
            key={o.value}
            className={`toggle-btn ${range === o.value ? 'active' : ''}`}
            onClick={() => setRange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-msg">Loading…</div>
      ) : (
        <>
          <HealthTimeline healthEvents={healthEvents} rangeStart={days[0]?.date} rangeEnd={days[days.length - 1]?.date} />
          <WeightChart days={days} />
          <NutritionChart days={days} sex={sex} />
          <ExerciseChart days={days} healthEvents={healthEvents} />
          <AlcoholChart days={days} sex={sex} />
        </>
      )}
    </div>
  )
}
