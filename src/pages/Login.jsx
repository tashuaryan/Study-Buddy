import { useState } from 'react'
import { auth } from '../firebase'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut
} from 'firebase/auth'

export default function Login({ onLogin }) {
  // 'login', 'signup', or 'reset'
  const [view, setView] = useState('login') 
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('') // Just for UI feel
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const clearForm = () => {
    setEmail('')
    setPassword('')
    setFullName('')
    setMessage({ type: '', text: '' })
  }

  const switchView = (newView) => {
    setView(newView)
    clearForm()
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      
      // Strict Instagram-style verification block
      if (!userCredential.user.emailVerified) {
        await signOut(auth)
        setMessage({ 
          type: 'error', 
          text: 'Please verify your email address to log in. Check your inbox.' 
        })
        setLoading(false)
        return
      }
      onLogin()
    } catch (err) {
      setMessage({ type: 'error', text: 'Sorry, your password was incorrect. Please double-check your password.' })
    }
    setLoading(false)
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      await sendEmailVerification(userCredential.user)
      await signOut(auth) // Lock the gate immediately
      
      setMessage({ 
        type: 'success', 
        text: 'Account created! We sent a confirmation link to your email.' 
      })
      // Clear password but keep email so they know what they typed
      setPassword('') 
    } catch (err) {
      const errorText = err.message.includes('email-already') 
        ? 'Another account is using the same email.' 
        : 'Sign up failed. Please try a different email.'
      setMessage({ type: 'error', text: errorText })
    }
    setLoading(false)
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Please enter your email to receive a login link.' })
      return
    }

    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      await sendPasswordResetEmail(auth, email)
      setMessage({ type: 'success', text: 'Login link sent! Check your email to reset your password.' })
    } catch (err) {
      setMessage({ type: 'error', text: 'No account found with that email address.' })
    }
    setLoading(false)
  }

  const isSubmitDisabled = view === 'reset' ? !email.trim() : !email.trim() || password.length < 6

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: '#fafafa', padding: '1rem', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    }}>
      
      {/* MAIN CARD */}
      <div style={{
        background: '#fff', border: '1px solid #dbdbdb', borderRadius: '1px', 
        padding: '40px 40px', width: '100%', maxWidth: '350px', marginBottom: '10px'
      }}>
        
        <h1 style={{ 
          textAlign: 'center', fontSize: '32px', fontWeight: 600, 
          margin: '0 0 35px 0', fontFamily: 'inherit', letterSpacing: '-0.5px' 
        }}>
          Study Buddy
        </h1>

        <form 
          onSubmit={view === 'login' ? handleLogin : view === 'signup' ? handleSignUp : handleResetPassword} 
          style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
        >
          <input
            type="email" placeholder="Email address"
            value={email} onChange={e => setEmail(e.target.value)}
            style={inputStyle}
          />
          
          {view === 'signup' && (
            <input
              type="text" placeholder="Full Name"
              value={fullName} onChange={e => setFullName(e.target.value)}
              style={inputStyle}
            />
          )}

          {view !== 'reset' && (
            <input
              type="password" placeholder="Password"
              value={password} onChange={e => setPassword(e.target.value)}
              style={inputStyle}
            />
          )}
          
          <button 
            type="submit" 
            disabled={loading || isSubmitDisabled} 
            style={{
              ...btnStyle, 
              opacity: (loading || isSubmitDisabled) ? 0.7 : 1,
              marginTop: '8px'
            }}
          >
            {loading ? 'Please wait...' : view === 'login' ? 'Log in' : view === 'signup' ? 'Sign up' : 'Send login link'}
          </button>
        </form>

        {/* DIVIDER */}
        {view === 'login' && (
          <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '15px' }}>
            <div style={{ flex: 1, height: '1px', background: '#dbdbdb' }} />
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#737373' }}>OR</div>
            <div style={{ flex: 1, height: '1px', background: '#dbdbdb' }} />
          </div>
        )}

        {/* FORGOT PASSWORD LINK */}
        {view === 'login' && (
          <div style={{ textAlign: 'center', marginTop: '15px' }}>
            <span 
              onClick={() => switchView('reset')}
              style={{ fontSize: '12px', color: '#00376b', cursor: 'pointer' }}
            >
              Forgot password?
            </span>
          </div>
        )}

        {/* BACK TO LOGIN FROM RESET */}
        {view === 'reset' && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <span 
              onClick={() => switchView('login')}
              style={{ fontSize: '14px', color: '#262626', cursor: 'pointer', fontWeight: 600 }}
            >
              Back to login
            </span>
          </div>
        )}

        {/* MESSAGES */}
        {message.text && (
          <div style={{
            marginTop: '20px', fontSize: '14px', textAlign: 'center',
            color: message.type === 'error' ? '#ed4956' : '#0095f6',
          }}>
            {message.text}
          </div>
        )}
      </div>

      {/* BOTTOM CARD (SWITCH VIEW) */}
      {view !== 'reset' && (
        <div style={{
          background: '#fff', border: '1px solid #dbdbdb', borderRadius: '1px', 
          padding: '20px', width: '100%', maxWidth: '350px', textAlign: 'center',
          fontSize: '14px', color: '#262626'
        }}>
          {view === 'login' ? (
            <>
              Don't have an account?{' '}
              <span onClick={() => switchView('signup')} style={linkStyle}>Sign up</span>
            </>
          ) : (
            <>
              Have an account?{' '}
              <span onClick={() => switchView('login')} style={linkStyle}>Log in</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}

const inputStyle = {
  padding: '9px 8px 7px', background: '#fafafa', border: '1px solid #dbdbdb', 
  borderRadius: '3px', fontSize: '12px', outline: 'none', width: '100%', 
  boxSizing: 'border-box', color: '#262626'
}

const btnStyle = {
  padding: '7px 16px', background: '#0095f6', color: 'white', 
  border: 'none', borderRadius: '8px', fontSize: '14px', 
  fontWeight: 600, cursor: 'pointer', width: '100%'
}

const linkStyle = {
  color: '#0095f6', fontWeight: 600, cursor: 'pointer'
}