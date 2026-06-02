import type { DaySummary, DiaryEntry } from '../types'
import EntryCard from './EntryCard'
import SummaryBar from './SummaryBar'

interface Props {
  summary: DaySummary
  sex: 'male' | 'female'
  onEntryUpdated: (entry: DiaryEntry) => void
  onEntryDeleted: (id: number) => void
}

export default function Dashboard({ summary, sex, onEntryUpdated, onEntryDeleted }: Props) {
  const food = summary.entries.filter(e => e.entry_type === 'food')
  const drinks = summary.entries.filter(e => e.entry_type === 'drink')
  const exercise = summary.entries.filter(e => e.entry_type === 'exercise')
  const weight = summary.entries.filter(e => e.entry_type === 'weight')
  const health = summary.entries.filter(e => e.entry_type === 'health')

  return (
    <div className="dashboard">
      <SummaryBar summary={summary} sex={sex} />

      <section className="log-section">
        <h3>Food</h3>
        {food.length === 0 ? <p className="empty">No food logged yet</p> : (
          food.map(e => (
            <EntryCard key={e.id} entry={e} onUpdated={onEntryUpdated} onDeleted={onEntryDeleted} />
          ))
        )}
      </section>

      <section className="log-section">
        <h3>Drink</h3>
        {drinks.length === 0 ? <p className="empty">No drinks logged yet</p> : (
          drinks.map(e => (
            <EntryCard key={e.id} entry={e} onUpdated={onEntryUpdated} onDeleted={onEntryDeleted} />
          ))
        )}
      </section>

      <section className="log-section">
        <h3>Exercise</h3>
        {exercise.length === 0 ? <p className="empty">No exercise logged yet</p> : (
          exercise.map(e => (
            <EntryCard key={e.id} entry={e} onUpdated={onEntryUpdated} onDeleted={onEntryDeleted} />
          ))
        )}
      </section>

      <section className="log-section">
        <h3>Weight</h3>
        {weight.length === 0 ? <p className="empty">No weight logged yet</p> : (
          weight.map(e => (
            <EntryCard key={e.id} entry={e} onUpdated={onEntryUpdated} onDeleted={onEntryDeleted} />
          ))
        )}
      </section>

      <section className="log-section">
        <h3>Health Events</h3>
        {health.length === 0 ? <p className="empty">No health events logged</p> : (
          health.map(e => (
            <EntryCard key={e.id} entry={e} onUpdated={onEntryUpdated} onDeleted={onEntryDeleted} />
          ))
        )}
      </section>
    </div>
  )
}
