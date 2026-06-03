import { useState, useEffect } from 'react'

function playAlarm() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)()

  const note = (freq, start, duration, vol = 0.5) => {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g)
    g.connect(ctx.destination)
    o.type = 'triangle'
    o.frequency.value = freq
    g.gain.setValueAtTime(0, start)
    g.gain.linearRampToValueAtTime(vol, start + 0.05)
    g.gain.exponentialRampToValueAtTime(0.001, start + duration)
    o.start(start)
    o.stop(start + duration + 0.1)
  }

  const melody = [523, 659, 784, 1047]
  melody.forEach((freq, i) => {
    note(freq, ctx.currentTime + i * 0.22, 0.5, 0.45)
  })
  melody.forEach((freq, i) => {
    note(freq, ctx.currentTime + melody.length * 0.22 + 0.1 + i * 0.22, 0.45, 0.3)
  })
  note(1047, ctx.currentTime + melody.length * 0.44 + 0.3, 1.2, 0.35)
}

export default function Reminders() {
  const [reminders, setReminders] = useState(() => {
    try { return JSON.parse(localStorage.getItem('reminders')) || [] } catch { return [] }
  })
  const [input, setInput] = useState('')
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')
  const [priority, setPriority] = useState('normal')
  const [ringing, setRinging] = useState(null)

  // Save to localStorage whenever reminders change
  useEffect(() => {
    localStorage.setItem('reminders', JSON.stringify(reminders))
  }, [reminders])

  // Check reminders every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      const currentTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
      const currentDate = now.toISOString().split('T')[0]
      setReminders(prev => prev.map(r => {
        if (r.time === currentTime && r.date === currentDate && !r.triggered) {
          playAlarm()
          setRinging(r)
          return { ...r, triggered: true }
        }
        return r
      }))
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  function addReminder() {
    if (!input.trim()) return
    setReminders(prev => [...prev, {
      id: Date.now(),
      text: input,
      time,
      date,
      priority,
      done: false,
      triggered: false,
    }])
    setInput('')
    setTime('')
    setDate('')
    setPriority('normal')
  }

  function toggleDone(id) {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, done: !r.done } : r))
  }

  function deleteReminder(id) {
    setReminders(prev => prev.filter(r => r.id !== id))
  }

  const priorityColor = {
    high: '#ff6b6b',
    normal: 'var(--accent)',
    low: '#a8d8a8',
  }

  const sorted = [...reminders].sort((a, b) => {
    const order = { high: 0, normal: 1, low: 2 }
    return order[a.priority] - order[b.priority]
  })

  return (
    <div>
      <h1>Reminders</h1>

      {/* Alarm popup */}
      {ringing && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff', borderRadius: '20px', padding: '32px',
            maxWidth: '340px', width: '90%', textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            <div style={{ fontSize: '52px', marginBottom: '12px' }}>⏰</div>
            <h2 style={{ color: '#be185d', marginBottom: '8px' }}>Reminder!</h2>
            <p style={{ fontSize: '18px', fontWeight: 600, color: '#111', marginBottom: '24px' }}>
              {ringing.text}
            </p>
            <button
              onClick={() => { playAlarm(); }}
              style={{
                background: '#f3f4f6', color: '#111', border: 'none',
                borderRadius: '12px', padding: '10px 20px',
                fontSize: '15px', cursor: 'pointer', marginRight: '8px', fontWeight: 600,
              }}>
              🔔 Ring Again
            </button>
            <button
              onClick={() => setRinging(null)}
              style={{
                background: 'linear-gradient(135deg, #ec4899, #be185d)',
                color: '#fff', border: 'none',
                borderRadius: '12px', padding: '10px 20px',
                fontSize: '15px', cursor: 'pointer', fontWeight: 600,
              }}>
              ✅ Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ color: 'var(--accent)', marginBottom: '1rem' }}>+ New Reminder</h3>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addReminder()}
          placeholder="What do you need to remember?"
          style={{ marginBottom: '0.75rem', width: '100%' }}
        />
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '120px' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--ink2)', marginBottom: '0.25rem' }}>📅 Date</p>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: '120px' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--ink2)', marginBottom: '0.25rem' }}>⏰ Alarm Time</p>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ width: '100%' }} />
          </div>
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--ink2)', marginBottom: '0.25rem' }}>Priority</p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['high', 'normal', 'low'].map(p => (
              <button key={p} onClick={() => setPriority(p)} style={{
                background: priority === p ? priorityColor[p] : 'var(--surface)',
                color: priority === p ? '#fff' : 'var(--ink)',
                border: '1px solid var(--border)',
                fontSize: '0.8rem', padding: '0.3rem 0.8rem',
              }}>
                {p === 'high' ? '🔴 High' : p === 'normal' ? '🟡 Normal' : '🟢 Low'}
              </button>
            ))}
          </div>
        </div>
        <button onClick={addReminder}>Add Reminder ✨</button>
      </div>

      {sorted.length === 0 && (
        <p style={{ color: 'var(--ink2)' }}>No reminders yet. Add one above! 🔔</p>
      )}

      {sorted.map(r => (
        <div key={r.id} className="card" style={{
          marginBottom: '0.75rem',
          borderLeft: `4px solid ${priorityColor[r.priority]}`,
          opacity: r.done ? 0.6 : 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <input type="checkbox" checked={r.done} onChange={() => toggleDone(r.id)}
              style={{ marginTop: '4px', cursor: 'pointer', width: '16px', height: '16px' }} />
            <div style={{ flex: 1 }}>
              <p style={{
                fontWeight: 600, color: 'var(--ink)',
                textDecoration: r.done ? 'line-through' : 'none',
                marginBottom: '0.25rem',
              }}>{r.text}</p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {r.date && <span style={{ fontSize: '0.75rem', color: 'var(--ink2)' }}>📅 {r.date}</span>}
                {r.time && <span style={{ fontSize: '0.75rem', color: 'var(--ink2)' }}>⏰ {r.time}</span>}
                <span style={{ fontSize: '0.75rem', color: priorityColor[r.priority], fontWeight: 600 }}>
                  {r.priority === 'high' ? '🔴 High' : r.priority === 'normal' ? '🟡 Normal' : '🟢 Low'}
                </span>
                {r.triggered && <span style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>✅ Alerted</span>}
              </div>
            </div>
            <button onClick={() => deleteReminder(r.id)} style={{
              background: 'rgba(220,50,50,0.15)', color: '#e03030',
              border: 'none', borderRadius: '8px',
              padding: '0.3rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer'
            }}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  )
}