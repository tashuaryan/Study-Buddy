import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { auth } from './firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import Nav from './components/Nav'
import Notes from './pages/Notes'
import TimerPage from './pages/TimerPage'
import Flashcards from './pages/Flashcards'
import AiTutor from './pages/AiTutor'
import Reminders from './pages/Reminders'
import Login from './pages/Login'
import './index.css'

// --- BULLETPROOF REACT AUDIO ENGINE ---
let audioCtx = null;

const playClickSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return; // Failsafe for older browsers
    
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
    
    // Wake up the audio context if the browser put it to sleep
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(600, audioCtx.currentTime); // Your original 600Hz sound
    
    // Smooth sound curve (prevents clicking/popping speaker noises)
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.1);
  } catch (err) {
    console.error("Sound error:", err);
  }
}

export default function App() {
  const [theme, setTheme] = useState('theme-neutral')
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)

  // This handles clicks INSIDE React so they never get blocked
  const handleAppClick = (e) => {
    // Check if the thing they clicked (or its parent) is a button or a link
    if (e.target.closest('button, a, input[type="submit"]')) {
      playClickSound();
    }
  }

  // Apply theme
  useEffect(() => {
    document.body.className = theme
  }, [theme])

  // THE BOUNCER
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u && !u.emailVerified) {
        setUser(null)
      } else {
        setUser(u)
      }
      setChecking(false)
    })
    return () => unsub()
  }, [])

  if (checking) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
      Loading...
    </div>
  )

  if (!user) return <Login onLogin={() => setUser(auth.currentUser)} />

  return (
    <BrowserRouter>
      {/* onClickCapture forces React to trigger this function on EVERY click */}
      <div className="app-bg" onClickCapture={handleAppClick}>
        <div className="app-shell">
          <Nav theme={theme} setTheme={setTheme} onLogout={() => signOut(auth)} />
          <main className="content">
            <Routes>
              <Route path="/" element={<Notes />} />
              <Route path="/timer" element={<TimerPage />} />
              <Route path="/flashcards" element={<Flashcards />} />
              <Route path="/ai" element={<AiTutor />} />
              <Route path="/reminders" element={<Reminders />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  )
}