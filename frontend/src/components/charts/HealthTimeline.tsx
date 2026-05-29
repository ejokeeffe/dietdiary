import type { HealthEvent } from '../../types'

interface Props {
  healthEvents: HealthEvent[]
  rangeStart?: string
  rangeEnd?: string
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000)
}

function clamp(dateStr: string, min: string, max: string): string {
  if (dateStr < min) return min
  if (dateStr > max) return max
  return dateStr
}

export default function HealthTimeline({ healthEvents, rangeStart, rangeEnd }: Props) {
  if (!rangeStart || !rangeEnd) return null

  const totalDays = daysBetween(rangeStart, rangeEnd) || 1

  function toPercent(dateStr: string): number {
    return (daysBetween(rangeStart!, dateStr) / totalDays) * 100
  }

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>Health Events</h3>
        <span className="chart-subtitle">
          <span className="health-legend-dot health-legend-dot--injury" /> Injury &nbsp;
          <span className="health-legend-dot health-legend-dot--illness" /> Illness
        </span>
      </div>

      {healthEvents.length === 0 ? (
        <div className="chart-empty">No health events logged in this period</div>
      ) : (
        <div className="health-timeline">
          {/* Date axis */}
          <div className="health-timeline-axis">
            <span>{fmtDate(rangeStart)}</span>
            <span>{fmtDate(rangeEnd)}</span>
          </div>

          {/* Event rows */}
          {healthEvents.map(event => {
            const start = clamp(event.start_date, rangeStart, rangeEnd)
            const end = clamp(event.end_date || event.start_date, rangeStart, rangeEnd)
            const left = toPercent(start)
            const width = Math.max(toPercent(end) - left, 1.5)

            return (
              <div key={event.entry_id} className="health-timeline-row">
                <div className="health-timeline-track">
                  <div
                    className={`health-timeline-bar health-timeline-bar--${event.event_type}`}
                    style={{ left: `${left}%`, width: `${width}%` }}
                    title={`${event.description}${event.severity ? ` (severity ${event.severity}/5)` : ''}${event.end_date ? ` · until ${fmtDate(event.end_date)}` : ''}`}
                  />
                </div>
                <div className="health-timeline-label">
                  <span className={`health-badge health-badge--${event.event_type}`}>
                    {event.event_type === 'injury' ? 'Injury' : 'Illness'}
                  </span>
                  <span className="health-timeline-desc">{event.description}</span>
                  {event.severity && <span className="health-timeline-sev">· {event.severity}/5</span>}
                  <span className="health-timeline-dates">
                    {fmtDate(event.start_date)}
                    {event.end_date && event.end_date !== event.start_date && ` → ${fmtDate(event.end_date)}`}
                    {!event.end_date && ' (ongoing)'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
