import type { ChatResponse, DaySummary, DiaryEntry, EntryUpdate, HistoryResponse, Profile } from '../types'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status}: ${text}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  getProfiles: (): Promise<Profile[]> =>
    request('/api/profiles'),

  createProfile: (name: string, sex: 'male' | 'female'): Promise<Profile> =>
    request('/api/profiles', {
      method: 'POST',
      body: JSON.stringify({ name, sex }),
    }),

  sendChat: (message: string, date: string, profileId: number): Promise<ChatResponse> =>
    request('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message, date, profile_id: profileId }),
    }),

  getDay: (date: string, profileId: number): Promise<DaySummary> =>
    request(`/api/day?date_str=${date}&profile_id=${profileId}`),

  getEntry: (id: number): Promise<DiaryEntry> =>
    request(`/api/entry/${id}`),

  updateEntry: (id: number, update: EntryUpdate): Promise<DiaryEntry> =>
    request(`/api/entry/${id}`, {
      method: 'PUT',
      body: JSON.stringify(update),
    }),

  deleteEntry: (id: number): Promise<void> =>
    request(`/api/entry/${id}`, { method: 'DELETE' }),

  getHistory: (profileId: number, days: number): Promise<HistoryResponse> =>
    request(`/api/history?profile_id=${profileId}&days=${days}`),
}
