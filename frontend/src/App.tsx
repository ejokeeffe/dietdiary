import { useCallback, useEffect, useState } from 'react'
import { api } from './api/client'
import type { DaySummary, DiaryEntry, Profile } from './types'
import Chat from './components/Chat'
import Dashboard from './components/Dashboard'
import DateNav from './components/DateNav'
import ProfileSwitcher from './components/ProfileSwitcher'
import ChartsTab from './components/ChartsTab'
import './App.css'

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const emptySummary = (date: string): DaySummary => ({
  date,
  entries: [],
  total_calories_consumed: 0,
  total_protein: 0,
  total_carbs: 0,
  total_fat: 0,
  total_fibre: 0,
  total_alcohol_units: 0,
  total_calories_burned: 0,
  net_calories: 0,
})

const PROFILE_KEY = 'health_diary_profile_id'
type Tab = 'daily' | 'charts'

export default function App() {
  const [profiles, setProfiles] = useState<Profile[] | null>(null)
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null)
  const [currentDate, setCurrentDate] = useState(todayStr())
  const [summary, setSummary] = useState<DaySummary>(emptySummary(todayStr()))
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('daily')

  useEffect(() => {
    api.getProfiles().then(ps => {
      setProfiles(ps)
      if (ps.length === 0) return
      const saved = localStorage.getItem(PROFILE_KEY)
      const savedId = saved ? parseInt(saved, 10) : null
      const match = savedId ? ps.find(p => p.id === savedId) : null
      setActiveProfile(match ?? ps[0])
    })
  }, [])

  function handleProfileCreated(profile: Profile) {
    setProfiles(prev => [...(prev ?? []), profile])
    setActiveProfile(profile)
    localStorage.setItem(PROFILE_KEY, String(profile.id))
  }

  const fetchDay = useCallback(async (date: string, profileId: number) => {
    setLoading(true)
    try {
      const data = await api.getDay(date, profileId)
      setSummary(data)
    } catch {
      setSummary(emptySummary(date))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeProfile) fetchDay(currentDate, activeProfile.id)
  }, [currentDate, activeProfile, fetchDay])

  // Advance to today if the app was left open past midnight
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        const today = todayStr()
        setCurrentDate(prev => prev < today ? today : prev)
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  function handleProfileChange(profile: Profile) {
    setActiveProfile(profile)
    localStorage.setItem(PROFILE_KEY, String(profile.id))
  }

  function handleEntryLogged(_entry: DiaryEntry) {
    if (activeProfile) fetchDay(currentDate, activeProfile.id)
  }

  function handleEntryUpdated(_updated: DiaryEntry) {
    if (activeProfile) fetchDay(currentDate, activeProfile.id)
  }

  function handleEntryDeleted(_id: number) {
    if (activeProfile) fetchDay(currentDate, activeProfile.id)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Health Diary <span className="header-today">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span></h1>
        <ProfileSwitcher
          profiles={profiles ?? []}
          activeId={activeProfile?.id ?? null}
          onChange={handleProfileChange}
          onProfileCreated={handleProfileCreated}
        />
      </header>
      <main className="app-main">
        {activeProfile ? (
          <>
            <Chat
              currentDate={currentDate}
              profileId={activeProfile.id}
              onEntryLogged={handleEntryLogged}
            />
            <div className="dashboard-col">
              <div className="tab-bar">
                <button
                  className={`tab-btn ${activeTab === 'daily' ? 'active' : ''}`}
                  onClick={() => setActiveTab('daily')}
                >
                  Daily Log
                </button>
                <button
                  className={`tab-btn ${activeTab === 'charts' ? 'active' : ''}`}
                  onClick={() => setActiveTab('charts')}
                >
                  Charts
                </button>
                {activeTab === 'daily' && (
                  <div className="tab-date-nav">
                    <DateNav date={currentDate} onChange={setCurrentDate} />
                  </div>
                )}
              </div>

              {activeTab === 'daily' ? (
                loading ? (
                  <div className="loading-msg">Loading…</div>
                ) : (
                  <Dashboard
                    summary={summary}
                    sex={activeProfile.sex}
                    onEntryUpdated={handleEntryUpdated}
                    onEntryDeleted={handleEntryDeleted}
                  />
                )
              ) : (
                <ChartsTab profileId={activeProfile.id} sex={activeProfile.sex} />
              )}
            </div>
          </>
        ) : profiles === null ? (
          <div className="loading-msg">Loading profiles…</div>
        ) : (
          <div className="loading-msg">No profiles yet — use the + button above to create one.</div>
        )}
      </main>
    </div>
  )
}
