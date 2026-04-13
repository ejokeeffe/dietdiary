interface Props {
  date: string // YYYY-MM-DD
  onChange: (date: string) => void
}

// Use local date parts to avoid UTC conversion shifting the date in non-UTC timezones
export function toLocalDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return toLocalDateStr(d)
}

export function formatDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === -1) return 'Yesterday'
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function DateNav({ date, onChange }: Props) {
  const today = toLocalDateStr(new Date())
  const isToday = date === today

  return (
    <div className="date-nav">
      <button onClick={() => onChange(addDays(date, -1))} aria-label="Previous day">◀</button>
      <span className="date-label">{formatDisplay(date)}</span>
      <button onClick={() => onChange(addDays(date, 1))} disabled={isToday} aria-label="Next day">▶</button>
    </div>
  )
}
