import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import type { DiaryEntry } from '../types'

interface Message {
  role: 'user' | 'assistant'
  text: string
  type?: 'entry' | 'edit' | 'answer' | 'error'
}

interface Props {
  currentDate: string
  profileId: number
  onEntryLogged: (entry: DiaryEntry) => void
}

export default function Chat({ currentDate, profileId, onEntryLogged }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: 'Hi! Log what you\'ve eaten, drunk, or done for exercise — or ask me a question about your diary.' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    setMessages(prev => [...prev, { role: 'user', text }])
    setInput('')
    setLoading(true)

    try {
      const res = await api.sendChat(text, currentDate, profileId)

      if ((res.type === 'entry' || res.type === 'edit') && res.confirmation) {
        setMessages(prev => [...prev, { role: 'assistant', text: res.confirmation!, type: res.type as 'entry' | 'edit' }])
        if (res.entry) onEntryLogged(res.entry)
      } else if (res.type === 'answer' && res.answer) {
        setMessages(prev => [...prev, { role: 'assistant', text: res.answer!, type: 'answer' }])
      } else if (res.type === 'error') {
        setMessages(prev => [...prev, { role: 'assistant', text: res.error ?? 'Something went wrong.', type: 'error' }])
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Failed to reach the server. Is the backend running?', type: 'error' }])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="chat-panel">
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.role} ${m.type ?? ''}`}>
            {m.text}
          </div>
        ))}
        {loading && (
          <div className="message assistant loading">Thinking…</div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-row">
        <textarea
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="What did you eat, drink, or do? Or ask a question…"
          rows={2}
          disabled={loading}
        />
        <button onClick={send} disabled={loading || !input.trim()} className="send-btn">
          {loading ? '…' : '→'}
        </button>
      </div>
    </div>
  )
}
