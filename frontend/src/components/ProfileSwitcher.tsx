import { useState } from 'react'
import { api } from '../api/client'
import type { Profile } from '../types'

interface Props {
  profiles: Profile[]
  activeId: number | null
  onChange: (profile: Profile) => void
  onProfileCreated: (profile: Profile) => void
}

export default function ProfileSwitcher({ profiles, activeId, onChange, onProfileCreated }: Props) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [sex, setSex] = useState<'male' | 'female'>('male')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    setError('')
    try {
      const profile = await api.createProfile(trimmed, sex)
      setName('')
      setSex('male')
      setAdding(false)
      onProfileCreated(profile)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create profile')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setAdding(false)
    setName('')
    setSex('male')
    setError('')
  }

  return (
    <div className="profile-switcher">
      {profiles.map(p => (
        <button
          key={p.id}
          className={`profile-btn ${p.id === activeId ? 'active' : ''}`}
          onClick={() => onChange(p)}
        >
          {p.name}
        </button>
      ))}

      {adding ? (
        <form className="profile-add-form" onSubmit={handleSubmit}>
          <input
            className="profile-add-input"
            placeholder="Name"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            disabled={saving}
          />
          <select
            className="profile-add-select"
            value={sex}
            onChange={e => setSex(e.target.value as 'male' | 'female')}
            disabled={saving}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          <button type="submit" className="profile-btn profile-add-save" disabled={saving || !name.trim()}>
            {saving ? '…' : 'Add'}
          </button>
          <button type="button" className="profile-btn profile-add-cancel" onClick={handleCancel} disabled={saving}>
            ✕
          </button>
          {error && <span className="profile-add-error">{error}</span>}
        </form>
      ) : (
        <button className="profile-btn profile-add-btn" onClick={() => setAdding(true)} title="Add profile">
          +
        </button>
      )}
    </div>
  )
}
