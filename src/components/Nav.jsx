import { NavLink } from 'react-router-dom'
import { BookOpen, Timer, Layers, Bot, Bell } from 'lucide-react'

export default function Nav({ theme, setTheme, onLogout }) {
  // Added the Neutral White theme to the very top of the list
  const themes = [
    { id: 'theme-neutral', label: '🤍 White' },
    { id: 'theme-pink', label: '🎀 Pink' },
    { id: 'theme-cozy', label: '🌿 Cozy' },
    { id: 'theme-dark', label: '🌙 Dark' },
  ]

  return (
    <nav className="nav">
      <div className="nav-title">✨ Study Buddy</div>

      {/* Global click sound in App.jsx handles the audio for these automatically */}
      <NavLink to="/">
        <BookOpen size={16} /> Notes
      </NavLink>
      <NavLink to="/timer">
        <Timer size={16} /> Timer
      </NavLink>
      <NavLink to="/flashcards">
        <Layers size={16} /> Flashcards
      </NavLink>
      <NavLink to="/ai">
        <Bot size={16} /> AI Tutor
      </NavLink>
      <NavLink to="/reminders">
        <Bell size={16} /> Reminders
      </NavLink>

      <div className="theme-switcher">
        <p style={{ fontSize: '0.75rem', color: 'var(--ink2)', marginBottom: '0.3rem' }}>Theme</p>
        {themes.map((t) => (
          <button
            key={t.id}
            className={`theme-btn ${theme === t.id ? 'active' : ''}`}
            onClick={() => setTheme(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      
      {/* Optional Logout Button if you want them to be able to sign out */}
      <button 
        onClick={onLogout} 
        style={{
          marginTop: '1rem', padding: '0.6rem', borderRadius: '10px', border: 'none',
          background: '#fee2e2', color: '#dc2626', fontWeight: 600, cursor: 'pointer',
          display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center'
        }}
      >
        Sign Out
      </button>
    </nav>
  )
}