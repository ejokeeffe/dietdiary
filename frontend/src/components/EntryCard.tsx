import { useState } from 'react'
import type { DiaryEntry, EntryUpdate } from '../types'
import { api } from '../api/client'

interface Props {
  entry: DiaryEntry
  onUpdated: (entry: DiaryEntry) => void
  onDeleted: (id: number) => void
}

function fmt(n: number | null | undefined, unit = '') {
  if (n == null) return null
  return `${n}${unit}`
}

export default function EntryCard({ entry, onUpdated, onDeleted }: Props) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fields, setFields] = useState<Record<string, string>>({})

  function startEdit() {
    const f: Record<string, string> = {
      entry_date: entry.entry_date,
      entry_time: entry.entry_time.slice(0, 5),
    }
    if (entry.food_log) {
      const fl = entry.food_log
      f.item_name = fl.item_name
      f.quantity = fl.quantity ?? ''
      f.calories = fl.calories?.toString() ?? ''
      f.protein = fl.protein?.toString() ?? ''
      f.carbs = fl.carbs?.toString() ?? ''
      f.fat = fl.fat?.toString() ?? ''
      f.fibre = fl.fibre?.toString() ?? ''
      f.sugar = fl.sugar?.toString() ?? ''
      f.notes = fl.notes ?? ''
    } else if (entry.drink_log) {
      const dl = entry.drink_log
      f.item_name = dl.item_name
      f.quantity_ml = dl.quantity_ml?.toString() ?? ''
      f.calories = dl.calories?.toString() ?? ''
      f.is_alcoholic = dl.is_alcoholic ? 'true' : 'false'
      f.alcohol_units = dl.alcohol_units?.toString() ?? ''
      f.notes = dl.notes ?? ''
    } else if (entry.exercise_log) {
      const el = entry.exercise_log
      f.exercise_type = el.exercise_type
      f.duration_minutes = el.duration_minutes?.toString() ?? ''
      f.distance_km = el.distance_km?.toString() ?? ''
      f.calories_burned = el.calories_burned?.toString() ?? ''
      f.notes = el.notes ?? ''
    }
    setFields(f)
    setEditing(true)
  }

  function set(key: string, val: string) {
    setFields(prev => ({ ...prev, [key]: val }))
  }

  async function save() {
    setSaving(true)
    try {
      const update: EntryUpdate = { entry_date: fields.entry_date, entry_time: fields.entry_time }
      if (entry.entry_type === 'food') {
        update.food = {
          item_name: fields.item_name,
          quantity: fields.quantity || null,
          calories: fields.calories ? parseFloat(fields.calories) : null,
          protein: fields.protein ? parseFloat(fields.protein) : null,
          carbs: fields.carbs ? parseFloat(fields.carbs) : null,
          fat: fields.fat ? parseFloat(fields.fat) : null,
          fibre: fields.fibre ? parseFloat(fields.fibre) : null,
          sugar: fields.sugar ? parseFloat(fields.sugar) : null,
          notes: fields.notes || null,
        }
      } else if (entry.entry_type === 'drink') {
        update.drink = {
          item_name: fields.item_name,
          quantity_ml: fields.quantity_ml ? parseFloat(fields.quantity_ml) : null,
          calories: fields.calories ? parseFloat(fields.calories) : null,
          is_alcoholic: fields.is_alcoholic === 'true',
          alcohol_units: fields.alcohol_units ? parseFloat(fields.alcohol_units) : null,
          notes: fields.notes || null,
        }
      } else if (entry.entry_type === 'exercise') {
        update.exercise = {
          exercise_type: fields.exercise_type,
          duration_minutes: fields.duration_minutes ? parseFloat(fields.duration_minutes) : null,
          distance_km: fields.distance_km ? parseFloat(fields.distance_km) : null,
          calories_burned: fields.calories_burned ? parseFloat(fields.calories_burned) : null,
          notes: fields.notes || null,
        }
      }
      const updated = await api.updateEntry(entry.id, update)
      onUpdated(updated)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  async function del() {
    if (!confirm('Delete this entry?')) return
    await api.deleteEntry(entry.id)
    onDeleted(entry.id)
  }

  const timeLabel = entry.entry_time.slice(0, 5)

  if (editing) {
    return (
      <div className="card editing">
        <div className="card-header">
          <label>Date <input type="date" value={fields.entry_date} onChange={e => set('entry_date', e.target.value)} /></label>
          <label>Time <input type="time" value={fields.entry_time} onChange={e => set('entry_time', e.target.value)} /></label>
        </div>
        <div className="card-fields">
          {entry.entry_type === 'food' && <>
            <label>Item <input value={fields.item_name} onChange={e => set('item_name', e.target.value)} /></label>
            <label>Quantity <input value={fields.quantity} onChange={e => set('quantity', e.target.value)} /></label>
            <label>Calories <input type="number" value={fields.calories} onChange={e => set('calories', e.target.value)} /></label>
            <label>Protein (g) <input type="number" value={fields.protein} onChange={e => set('protein', e.target.value)} /></label>
            <label>Carbs (g) <input type="number" value={fields.carbs} onChange={e => set('carbs', e.target.value)} /></label>
            <label>Fat (g) <input type="number" value={fields.fat} onChange={e => set('fat', e.target.value)} /></label>
            <label>Fibre (g) <input type="number" value={fields.fibre} onChange={e => set('fibre', e.target.value)} /></label>
            <label>Sugar (g) <input type="number" value={fields.sugar} onChange={e => set('sugar', e.target.value)} /></label>
            <label>Notes <input value={fields.notes} onChange={e => set('notes', e.target.value)} /></label>
          </>}
          {entry.entry_type === 'drink' && <>
            <label>Item <input value={fields.item_name} onChange={e => set('item_name', e.target.value)} /></label>
            <label>Volume (ml) <input type="number" value={fields.quantity_ml} onChange={e => set('quantity_ml', e.target.value)} /></label>
            <label>Calories <input type="number" value={fields.calories} onChange={e => set('calories', e.target.value)} /></label>
            <label>Alcoholic
              <select value={fields.is_alcoholic} onChange={e => set('is_alcoholic', e.target.value)}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </label>
            <label>Alcohol units <input type="number" step="0.1" value={fields.alcohol_units} onChange={e => set('alcohol_units', e.target.value)} /></label>
            <label>Notes <input value={fields.notes} onChange={e => set('notes', e.target.value)} /></label>
          </>}
          {entry.entry_type === 'exercise' && <>
            <label>Type <input value={fields.exercise_type} onChange={e => set('exercise_type', e.target.value)} /></label>
            <label>Duration (min) <input type="number" value={fields.duration_minutes} onChange={e => set('duration_minutes', e.target.value)} /></label>
            <label>Distance (km) <input type="number" step="0.1" value={fields.distance_km} onChange={e => set('distance_km', e.target.value)} /></label>
            <label>Calories burned <input type="number" value={fields.calories_burned} onChange={e => set('calories_burned', e.target.value)} /></label>
            <label>Notes <input value={fields.notes} onChange={e => set('notes', e.target.value)} /></label>
          </>}
        </div>
        <div className="card-actions">
          <button onClick={save} disabled={saving} className="btn-save">{saving ? 'Saving…' : 'Save'}</button>
          <button onClick={() => setEditing(false)} className="btn-cancel">Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-time">{timeLabel}</span>
        <div className="card-actions">
          <button onClick={startEdit} className="btn-edit">Edit</button>
          <button onClick={del} className="btn-delete">Delete</button>
        </div>
      </div>
      <div className="card-body">
        {entry.entry_type === 'food' && entry.food_log && (
          <>
            <strong>{entry.food_log.item_name}</strong>
            {entry.food_log.quantity && <span className="detail"> · {entry.food_log.quantity}</span>}
            <div className="macros">
              {fmt(entry.food_log.calories, ' kcal') && <span>{fmt(entry.food_log.calories, ' kcal')}</span>}
              {fmt(entry.food_log.protein, 'g') && <span>P: {fmt(entry.food_log.protein, 'g')}</span>}
              {fmt(entry.food_log.carbs, 'g') && <span>C: {fmt(entry.food_log.carbs, 'g')}</span>}
              {fmt(entry.food_log.fat, 'g') && <span>F: {fmt(entry.food_log.fat, 'g')}</span>}
            </div>
            {entry.food_log.notes && <div className="notes">{entry.food_log.notes}</div>}
          </>
        )}
        {entry.entry_type === 'drink' && entry.drink_log && (
          <>
            <strong>{entry.drink_log.item_name}</strong>
            {entry.drink_log.quantity_ml && <span className="detail"> · {entry.drink_log.quantity_ml}ml</span>}
            <div className="macros">
              {fmt(entry.drink_log.calories, ' kcal') && <span>{fmt(entry.drink_log.calories, ' kcal')}</span>}
              {entry.drink_log.is_alcoholic && <span className="alcohol">{fmt(entry.drink_log.alcohol_units, ' units')}</span>}
            </div>
            {entry.drink_log.notes && <div className="notes">{entry.drink_log.notes}</div>}
          </>
        )}
        {entry.entry_type === 'exercise' && entry.exercise_log && (
          <>
            <strong>{entry.exercise_log.exercise_type}</strong>
            <div className="macros">
              {fmt(entry.exercise_log.duration_minutes, ' min') && <span>{fmt(entry.exercise_log.duration_minutes, ' min')}</span>}
              {fmt(entry.exercise_log.distance_km, ' km') && <span>{fmt(entry.exercise_log.distance_km, ' km')}</span>}
              {fmt(entry.exercise_log.calories_burned, ' kcal burned') && <span>{fmt(entry.exercise_log.calories_burned, ' kcal burned')}</span>}
            </div>
            {entry.exercise_log.notes && <div className="notes">{entry.exercise_log.notes}</div>}
          </>
        )}
      </div>
    </div>
  )
}
