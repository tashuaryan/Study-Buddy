import { useState, useEffect, useRef } from 'react'

const presets = [
  { label: '🍅 Focus', minutes: 25 },
  { label: '☕ Short Break', minutes: 5 },
  { label: '🌿 Long Break', minutes: 15 },
  { label: '📖 Study', minutes: 45 },
  { label: '⚡ Quick', minutes: 10 },
]

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

  // Gentle chime melody: C5 E5 G5 C6 played twice
  const melody = [523, 659, 784, 1047]
  melody.forEach((freq, i) => {
    note(freq, ctx.currentTime + i * 0.22, 0.5, 0.45)
  })
  melody.forEach((freq, i) => {
    note(freq, ctx.currentTime + melody.length * 0.22 + 0.1 + i * 0.22, 0.45, 0.3)
  })
  // Final long high note
  note(1047, ctx.currentTime + melody.length * 0.44 + 0.3, 1.2, 0.35)
}

export default function TimerPage() {
  const [totalSeconds, setTotalSeconds] = useState(25 * 60)
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [customMin, setCustomMin] = useState('')
  const [showDone, setShowDone] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current)
            setRunning(false)
            playAlarm()
            setShowDone(true)
            return 0
          }
          return s - 1
        })
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running])

  function setPreset(minutes) {
    setRunning(false)
    setShowDone(false)
    setTotalSeconds(minutes * 60)
    setSecondsLeft(minutes * 60)
  }

  function setCustom() {
    const m = parseInt(customMin)
    if (!m || m < 1) return
    setPreset(m)
    setCustomMin('')
  }

  function reset() {
    setRunning(false)
    setShowDone(false)
    setSecondsLeft(totalSeconds)
  }

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const secs = String(secondsLeft % 60).padStart(2, '0')
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100
  const circumference = 2 * Math.PI * 110

  return (
    <div>
      <h1>Study Timer</h1>

      {/* Done popup */}
      {showDone && (
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
            <div style={{ fontSize: '52px', marginBottom: '12px' }}>🎉</div>
            <h2 style={{ color: '#be185d', marginBottom: '8px' }}>Time's Up!</h2>
            <p style={{ fontSize: '16px', color: '#555', marginBottom: '24px' }}>
              Great work! Take a break. 🌸
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
              onClick={() => setShowDone(false)}
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

      {/* Presets */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {presets.map(p => (
          <button key={p.label} onClick={() => setPreset(p.minutes)}
            style={{ fontSize: '0.85rem' }}>
            {p.label} {p.minutes}m
          </button>
        ))}
      </div>

      {/* Circular timer */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', width: '260px', height: '260px' }}>
          <svg width="260" height="260" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="130" cy="130" r="110"
              fill="none" stroke="var(--border)" strokeWidth="12" />
            <circle cx="130" cy="130" r="110"
              fill="none" stroke="var(--accent)" strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (circumference * progress / 100)}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>
              {mins}:{secs}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--ink2)', marginTop: '0.3rem' }}>
              {running ? '⏳ Focus!' : secondsLeft === 0 ? '✅ Done!' : '⏸ Paused'}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
        <button onClick={() => setRunning(!running)} style={{ fontSize: '1rem', padding: '0.7rem 2rem' }}>
          {running ? '⏸ Pause' : '▶ Start'}
        </button>
        <button onClick={reset} style={{
          fontSize: '1rem', padding: '0.7rem 1.5rem',
          background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--border)'
        }}>
          🔄 Reset
        </button>
      </div>

      {/* Custom time */}
      <div className="card" style={{ maxWidth: '300px', margin: '0 auto' }}>
        <p style={{ fontWeight: 700, marginBottom: '0.5rem', color: 'var(--ink)' }}>⏱️ Custom Time</p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="number"
            value={customMin}
            onChange={(e) => setCustomMin(e.target.value)}
            placeholder="Minutes..."
            min="1" max="180"
            style={{ flex: 1 }}
          />
          <button onClick={setCustom}>Set</button>
        </div>
      </div>
    </div>
  )
}