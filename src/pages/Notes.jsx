import { useState, useEffect, useRef, useCallback } from 'react'

const STORAGE_KEY_NOTEBOOKS = 'studybuddy_notebooks'
const STORAGE_KEY_STICKIES  = 'studybuddy_stickies'
const AUTOSAVE_DELAY_MS     = 1200

const covers = [
  { id: 'campus',  label: '🌸 Campus',  img: '/images/cover-campus.jpg' },
  { id: 'bows',    label: '🎀 Bows',    img: '/images/cover-bows.jpg' },
  { id: 'minimal', label: '🤎 Minimal', img: '/images/cover-minimal.jpg' },
  { id: 'blue',    label: '💙 Blue',    img: '/images/cover-blue.jpg' },
  { id: 'bunny',   label: '🐰 Bunny',   img: '/images/cover-bunny.jpg' },
]

const pageStyles = [
  { id: 'ruled',  label: '📝 Ruled'  },
  { id: 'dotted', label: '• Dotted'  },
  { id: 'grid',   label: '⊞ Grid'   },
  { id: 'plain',  label: '□ Plain'  },
  { id: 'cherry', label: '🍒 Cherry' },
]

const pageColors = [
  { id: 'white',  label: 'White',  bg: '#ffffff', line: '#e0e0e0' },
  { id: 'cream',  label: 'Cream',  bg: '#fdf6e3', line: '#e8d5a3' },
  { id: 'pink',   label: 'Pink',   bg: '#fff0f5', line: '#ffb6c1' },
  { id: 'blue',   label: 'Blue',   bg: '#f0f5ff', line: '#b6c8ff' },
  { id: 'green',  label: 'Green',  bg: '#f0fff4', line: '#b6ffcc' },
  { id: 'yellow', label: 'Yellow', bg: '#fffdf0', line: '#ffe8a3' },
]

const stickyColors = [
  { id: 'green',    img: '/images/sticky-green.jpg' },
  { id: 'pink',     img: '/images/sticky-pink.jpg'  },
  { id: 'dark',     img: '/images/sticky-dark.jpg'  },
  { id: 'yellow',   bg: '#fff9c4' },
  { id: 'lavender', bg: '#e8d5f5' },
]

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (e) {
    console.warn('Storage error:', e)
    return false
  }
}

function PageBackground({ style, color }) {
  const c = pageColors.find(p => p.id === color)
  const bg = c?.bg || '#fff'
  const line = c?.line || '#ddd'
  const base = { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: bg }
  if (style === 'ruled') return (
    <div style={{ ...base, backgroundImage: `repeating-linear-gradient(transparent, transparent 31px, ${line} 31px, ${line} 32px)`, backgroundPositionY: '8px' }} />
  )
  if (style === 'dotted') return (
    <div style={{ ...base, backgroundImage: `radial-gradient(circle, ${line} 1.5px, transparent 1.5px)`, backgroundSize: '24px 24px' }} />
  )
  if (style === 'grid') return (
    <div style={{ ...base, backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`, backgroundSize: '24px 24px' }} />
  )
  if (style === 'cherry') return (
    <div style={{ ...base }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '60px', background: '#8b0000', display: 'flex', alignItems: 'center', padding: '0 1rem', gap: '0.5rem' }}>
        <span style={{ fontSize: '1.3rem' }}>🍒</span>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.85rem' }}>My Notes</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <span key={i} style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#6b0000', color: '#fff', fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{d}</span>
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', top: '60px', left: 0, right: 0, bottom: 0, backgroundImage: `repeating-linear-gradient(transparent, transparent 31px, ${line} 31px, ${line} 32px)` }} />
    </div>
  )
  return <div style={base} />
}

function SaveToast({ status }) {
  if (!status) return null
  const config = {
    saving: { bg: '#f0f0f0', color: '#555',    icon: '💾', text: 'Saving…'     },
    saved:  { bg: '#e8f8ee', color: '#2d7a4f', icon: '✅', text: 'Saved!'      },
    error:  { bg: '#fee',    color: '#c0392b', icon: '⚠️', text: 'Save failed' },
  }[status]
  return (
    <div style={{
      position: 'fixed', bottom: '5rem', right: '1.2rem', zIndex: 9999,
      background: config.bg, color: config.color,
      padding: '0.55rem 1.1rem', borderRadius: '20px',
      fontSize: '0.82rem', fontWeight: 700,
      boxShadow: '0 4px 16px rgba(0,0,0,0.14)',
      display: 'flex', alignItems: 'center', gap: '0.4rem',
      animation: 'fadeInUp 0.25s ease', pointerEvents: 'none',
    }}>
      <span>{config.icon}</span>{config.text}
    </div>
  )
}

// ── DRAWING CANVAS ──────────────────────────────────────────────────────────
const PEN_COLORS = ['#222222','#e91e8c','#2563eb','#16a34a','#dc2626','#7c3aed','#ea580c','#ffffff']

function DrawingCanvas({ pageColor, onSave, onClose, existingDrawing }) {
  const canvasRef  = useRef(null)
  const [drawing,  setDrawing]  = useState(false)
  const [tool,     setTool]     = useState('pen')
  const [penColor, setPenColor] = useState('#222222')
  const [penSize,  setPenSize]  = useState(3)
  const lastPos = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const c = pageColors.find(p => p.id === pageColor)
    ctx.fillStyle = c?.bg || '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    if (existingDrawing) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0)
      img.src = existingDrawing
    }
  }, [])

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const src = e.touches ? e.touches[0] : e
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top)  * scaleY,
    }
  }

  const getBgColor = () => pageColors.find(p => p.id === pageColor)?.bg || '#fff'

  const startDraw = (e) => {
    e.preventDefault()
    const canvas = canvasRef.current
    const pos = getPos(e, canvas)
    lastPos.current = pos
    setDrawing(true)
    const ctx = canvas.getContext('2d')
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, (tool === 'eraser' ? penSize * 4 : penSize) / 2, 0, Math.PI * 2)
    ctx.fillStyle = tool === 'eraser' ? getBgColor() : penColor
    ctx.fill()
  }

  const draw = (e) => {
    e.preventDefault()
    if (!drawing || !lastPos.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = tool === 'eraser' ? getBgColor() : penColor
    ctx.lineWidth   = tool === 'eraser' ? penSize * 4 : penSize
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
    ctx.stroke()
    lastPos.current = pos
  }

  const stopDraw = (e) => { e?.preventDefault(); setDrawing(false); lastPos.current = null }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = getBgColor()
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.75)', zIndex: 9999,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '0.75rem', boxSizing: 'border-box',
    }}>
      {/* Toolbar */}
      <div style={{
        background: '#fff', borderRadius: '16px',
        padding: '0.6rem 0.9rem', marginBottom: '0.6rem',
        display: 'flex', gap: '0.5rem', flexWrap: 'wrap',
        alignItems: 'center', width: '100%', maxWidth: '600px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)', boxSizing: 'border-box',
      }}>
        <button onClick={() => setTool('pen')} style={{
          ...tBtn, background: tool === 'pen' ? 'var(--accent,#e91e8c)' : '#f5f5f5',
          color: tool === 'pen' ? '#fff' : '#333',
        }}>✏️ Pen</button>

        <button onClick={() => setTool('eraser')} style={{
          ...tBtn, background: tool === 'eraser' ? 'var(--accent,#e91e8c)' : '#f5f5f5',
          color: tool === 'eraser' ? '#fff' : '#333',
        }}>🧹 Eraser</button>

        <input type="range" min="1" max="20" value={penSize}
          onChange={e => setPenSize(Number(e.target.value))}
          style={{ width: '65px', accentColor: 'var(--accent,#e91e8c)' }} />
        <span style={{ fontSize: '0.72rem', color: '#888', minWidth: '24px' }}>{penSize}px</span>

        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          {PEN_COLORS.map(c => (
            <div key={c} onClick={() => { setPenColor(c); setTool('pen') }} style={{
              width: '22px', height: '22px', borderRadius: '50%', background: c,
              cursor: 'pointer', boxSizing: 'border-box',
              border: penColor === c && tool === 'pen'
                ? '3px solid var(--accent,#e91e8c)' : '2px solid #ccc',
            }} />
          ))}
        </div>

        <button onClick={clearCanvas} style={{ ...tBtn, background: '#fee2e2', color: '#dc2626', marginLeft: 'auto' }}>
          🗑️ Clear
        </button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef} width={600} height={750}
        onMouseDown={startDraw} onMouseMove={draw}
        onMouseUp={stopDraw}    onMouseLeave={stopDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
        style={{
          borderRadius: '12px', width: '100%', maxWidth: '600px',
          maxHeight: '58vh', touchAction: 'none', display: 'block',
          cursor: tool === 'eraser' ? 'cell' : 'crosshair',
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        }}
      />

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.7rem' }}>
        <button onClick={onClose} style={{
          padding: '0.65rem 1.4rem', borderRadius: '12px',
          background: '#f5f5f5', color: '#333',
          border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
        }}>✕ Cancel</button>
        <button onClick={() => onSave(canvasRef.current.toDataURL('image/png'))} style={{
          padding: '0.65rem 1.4rem', borderRadius: '12px',
          background: 'var(--accent,#e91e8c)', color: '#fff',
          border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
          boxShadow: '0 4px 12px rgba(233,30,140,0.35)',
        }}>💾 Save Drawing</button>
      </div>
    </div>
  )
}

const tBtn = {
  padding: '0.35rem 0.75rem', borderRadius: '8px',
  border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem',
}
export default function Notes() {
  const [notebooks,      setNotebooks]      = useState(() => loadFromStorage(STORAGE_KEY_NOTEBOOKS, []))
  const [stickies,       setStickies]       = useState(() => loadFromStorage(STORAGE_KEY_STICKIES, []))
  const [view,           setView]           = useState('home')
  const [openNotebook,   setOpenNotebook]   = useState(null)
  const [creating,       setCreating]       = useState(false)
  const [newTitle,       setNewTitle]       = useState('')
  const [newCover,       setNewCover]       = useState('campus')
  const [newPage,        setNewPage]        = useState('ruled')
  const [newColor,       setNewColor]       = useState('cream')
  const [bookView,       setBookView]       = useState('single')
  const [addingSticky,   setAddingSticky]   = useState(false)
  const [stickyText,     setStickyText]     = useState('')
  const [stickyColor,    setStickyColor]    = useState('yellow')
  const [saveStatus,     setSaveStatus]     = useState(null)
  const [editingSticky,  setEditingSticky]  = useState(null)
  const [editStickyText, setEditStickyText] = useState('')
  // ── NEW drawing states ──
  const [showCanvas,     setShowCanvas]     = useState(false)
  const autosaveTimer = useRef(null)
  const toastTimer    = useRef(null)

  useEffect(() => {
    const ok = saveToStorage(STORAGE_KEY_NOTEBOOKS, notebooks)
    if (!ok) showToast('error')
  }, [notebooks])

  useEffect(() => { saveToStorage(STORAGE_KEY_STICKIES, stickies) }, [stickies])

  useEffect(() => {
    if (!openNotebook) return
    const updated = notebooks.find(n => n.id === openNotebook.id)
    if (updated) setOpenNotebook(updated)
  }, [notebooks])

  useEffect(() => () => {
    clearTimeout(autosaveTimer.current)
    clearTimeout(toastTimer.current)
  }, [])

  function showToast(status, duration = 1800) {
    setSaveStatus(status)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setSaveStatus(null), duration)
  }

  function manualSave() {
    setSaveStatus('saving')
    setTimeout(() => {
      const ok = saveToStorage(STORAGE_KEY_NOTEBOOKS, notebooks)
      showToast(ok ? 'saved' : 'error')
    }, 300)
  }

  const scheduleAutosave = useCallback(() => {
    clearTimeout(autosaveTimer.current)
    setSaveStatus('saving')
    autosaveTimer.current = setTimeout(() => showToast('saved'), AUTOSAVE_DELAY_MS)
  }, [])

  function createNotebook() {
    if (!newTitle.trim()) return
    const nb = {
      id: Date.now(), title: newTitle.trim(),
      cover: newCover, page: newPage, color: newColor,
      content: '', content2: '', drawing: null,
      createdAt: new Date().toISOString(),
    }
    setNotebooks(prev => [nb, ...prev])
    setNewTitle('')
    setCreating(false)
    showToast('saved')
  }

  function deleteNotebook(id) {
    setNotebooks(prev => prev.filter(n => n.id !== id))
    if (openNotebook?.id === id) setOpenNotebook(null)
  }

  function updateContent(id, field, value) {
    setNotebooks(prev => prev.map(n => n.id === id ? { ...n, [field]: value } : n))
    setOpenNotebook(prev => ({ ...prev, [field]: value }))
    scheduleAutosave()
  }

  function saveDrawing(dataUrl) {
    setNotebooks(prev => prev.map(n => n.id === openNotebook.id ? { ...n, drawing: dataUrl } : n))
    setOpenNotebook(prev => ({ ...prev, drawing: dataUrl }))
    setShowCanvas(false)
    showToast('saved')
  }

  function deleteDrawing() {
    setNotebooks(prev => prev.map(n => n.id === openNotebook.id ? { ...n, drawing: null } : n))
    setOpenNotebook(prev => ({ ...prev, drawing: null }))
    showToast('saved')
  }

  function addSticky() {
    if (!stickyText.trim()) return
    setStickies(prev => [{
      id: Date.now(), text: stickyText.trim(),
      color: stickyColor, createdAt: new Date().toISOString(),
    }, ...prev])
    setStickyText('')
    setAddingSticky(false)
    showToast('saved')
  }

  function deleteSticky(id) { setStickies(prev => prev.filter(s => s.id !== id)) }

  function startEditSticky(s) { setEditingSticky(s.id); setEditStickyText(s.text) }

  function saveEditSticky() {
    setStickies(prev => prev.map(s => s.id === editingSticky ? { ...s, text: editStickyText } : s))
    setEditingSticky(null)
    showToast('saved')
  }

  const getSticky = id => stickyColors.find(s => s.id === id)
  const topPad = openNotebook?.page === 'cherry' ? '70px' : '1.5rem'

  // ── OPEN NOTEBOOK VIEW ──────────────────────────────────────────────────
  if (openNotebook) {
    return (
      <div style={{ paddingBottom: '2rem' }}>
        <SaveToast status={saveStatus} />

        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          marginBottom: '1rem', flexWrap: 'wrap',
          position: 'sticky', top: 0, zIndex: 10,
          background: 'var(--surface, #fff)',
          padding: '0.6rem 0',
          borderBottom: '1px solid var(--border, #eee)',
        }}>
          <button onClick={() => { setOpenNotebook(null); setShowCanvas(false) }} style={btnStyle('ghost')}>← Back</button>
          <h2 style={{ color: 'var(--accent)', margin: 0, fontSize: 'clamp(1rem,4vw,1.3rem)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {openNotebook.title}
          </h2>
          <button onClick={manualSave} style={{ ...btnStyle('primary'), fontSize: '0.78rem', padding: '0.4rem 0.85rem' }}>
            💾 Save
          </button>
          {/* View toggle */}
          <button onClick={() => setBookView('single')} style={{ ...btnStyle(bookView === 'single' ? 'primary' : 'ghost'), fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}>📄</button>
          <button onClick={() => setBookView('double')} style={{ ...btnStyle(bookView === 'double' ? 'primary' : 'ghost'), fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}>📖</button>
          {/* Draw button */}
          <button onClick={() => setShowCanvas(true)} style={{ ...btnStyle('ghost'), fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}>
            ✏️ Draw
          </button>
        </div>

        {/* Notebook pages */}
        <div style={{
          display: 'flex',
          maxWidth: bookView === 'double' ? '95vw' : '580px',
          margin: '0 auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          borderRadius: '10px', overflow: 'hidden', minHeight: '75vh',
        }}>
          <div style={{ position: 'relative', flex: 1, minHeight: '75vh' }}>
            <PageBackground style={openNotebook.page} color={openNotebook.color} />
            <textarea
              value={openNotebook.content}
              onChange={e => updateContent(openNotebook.id, 'content', e.target.value)}
              placeholder="Start writing…"
              style={textareaStyle(openNotebook, topPad)}
            />
          </div>
          {bookView === 'double' && <SpiralDivider />}
          {bookView === 'double' && (
            <div style={{ position: 'relative', flex: 1, minHeight: '75vh' }}>
              <PageBackground style={openNotebook.page} color={openNotebook.color} />
              <textarea
                value={openNotebook.content2}
                onChange={e => updateContent(openNotebook.id, 'content2', e.target.value)}
                placeholder="Continue writing…"
                style={textareaStyle(openNotebook, topPad)}
              />
            </div>
          )}
        </div>

        {/* Word count */}
        <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--ink2,#999)', marginTop: '0.6rem' }}>
          {(openNotebook.content + ' ' + openNotebook.content2).trim().split(/\s+/).filter(Boolean).length} words
        </p>

        {/* Saved drawing preview */}
        {openNotebook.drawing && (
          <div style={{ maxWidth: '580px', margin: '1rem auto 0', textAlign: 'center' }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--ink2)', marginBottom: '0.4rem', fontWeight: 700 }}>
              ✏️ Handwriting Page
            </p>
            <img src={openNotebook.drawing} alt="Drawing"
              style={{ width: '100%', borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }} />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.5rem' }}>
              <button onClick={() => setShowCanvas(true)} style={{ ...btnStyle('ghost'), fontSize: '0.78rem' }}>
                ✏️ Edit Drawing
              </button>
              <button onClick={deleteDrawing} style={{ ...btnStyle('ghost'), fontSize: '0.78rem', color: '#dc2626' }}>
                🗑️ Delete Drawing
              </button>
            </div>
          </div>
        )}

        {/* Drawing canvas modal */}
        {showCanvas && (
          <DrawingCanvas
            pageColor={openNotebook.color}
            existingDrawing={openNotebook.drawing || null}
            onClose={() => setShowCanvas(false)}
            onSave={saveDrawing}
          />
        )}

        <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
      </div>
    )
  }
  // ── HOME VIEW ────────────────────────────────────────────────────────────
  return (
    <div style={{ paddingBottom: '5rem' }}>
      <SaveToast status={saveStatus} />

      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem',
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--surface, #fff)', padding: '0.5rem 0',
        borderBottom: '1px solid var(--border, #eee)',
      }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(1.2rem,5vw,1.6rem)' }}>My Notes</h1>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button onClick={() => { setView(view === 'sticky' ? 'home' : 'sticky'); setCreating(false); setAddingSticky(false) }}
            style={{ ...btnStyle('ghost'), fontSize: '0.82rem' }}>
            {view === 'sticky' ? '📓 Notebooks' : '🗒️ Stickies'}
          </button>
          <button onClick={() => view === 'sticky' ? setAddingSticky(true) : setCreating(true)}
            style={{ ...btnStyle('primary'), fontSize: '0.82rem' }}>
            + New {view === 'sticky' ? 'Sticky' : 'Notebook'}
          </button>
        </div>
      </div>

      {/* Create notebook form */}
      {creating && view === 'home' && (
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--accent)', fontSize: '1.05rem' }}>✨ New Notebook</h3>
          <input
            value={newTitle} onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createNotebook()}
            placeholder="Notebook title…" autoFocus
            style={{ marginBottom: '1rem', width: '100%', fontSize: '1rem', padding: '0.6rem 0.8rem', borderRadius: '10px', border: '1.5px solid var(--border,#ddd)', boxSizing: 'border-box' }}
          />
          <SectionLabel>Choose Cover:</SectionLabel>
          <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            {covers.map(c => (
              <div key={c.id} onClick={() => setNewCover(c.id)} style={{
                cursor: 'pointer',
                border: newCover === c.id ? '3px solid var(--accent)' : '3px solid transparent',
                borderRadius: '10px', overflow: 'hidden',
                transform: newCover === c.id ? 'scale(1.06)' : 'scale(1)',
                transition: 'all 0.18s',
              }}>
                <img src={c.img} alt={c.label} style={{ width: '62px', height: '85px', objectFit: 'cover', display: 'block' }} />
                <p style={{ fontSize: '0.6rem', textAlign: 'center', padding: '0.2rem', color: 'var(--ink)', margin: 0 }}>{c.label}</p>
              </div>
            ))}
          </div>
          <SectionLabel>Page Style:</SectionLabel>
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            {pageStyles.map(p => (
              <button key={p.id} onClick={() => setNewPage(p.id)} style={{
                background: newPage === p.id ? 'var(--accent)' : 'var(--surface)',
                color: newPage === p.id ? '#fff' : 'var(--ink)',
                border: '1.5px solid var(--border,#ddd)',
                padding: '0.45rem 0.85rem', borderRadius: '10px',
                cursor: 'pointer', fontSize: '0.82rem', minHeight: '40px',
              }}>{p.label}</button>
            ))}
          </div>
          <SectionLabel>Page Color:</SectionLabel>
          <div style={{ display: 'flex', gap: '0.55rem', marginBottom: '1.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {pageColors.map(c => (
              <div key={c.id} onClick={() => setNewColor(c.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: c.bg, border: newColor === c.id ? '3px solid var(--accent)' : '2px solid #bbb', transition: 'all 0.18s' }} />
                <span style={{ fontSize: '0.58rem', color: 'var(--ink)', fontWeight: 600 }}>{c.label}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={createNotebook} style={btnStyle('primary')}>Create ✨</button>
            <button onClick={() => setCreating(false)} style={btnStyle('ghost')}>Cancel</button>
          </div>
        </div>
      )}

      {/* Add sticky form */}
      {addingSticky && view === 'sticky' && (
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--accent)', fontSize: '1.05rem' }}>🗒️ New Sticky Note</h3>
          <textarea
            value={stickyText} onChange={e => setStickyText(e.target.value)}
            placeholder="Write your note…" autoFocus
            style={{ marginBottom: '1rem', minHeight: '90px', width: '100%', fontSize: '1rem', padding: '0.6rem 0.8rem', borderRadius: '10px', border: '1.5px solid var(--border,#ddd)', boxSizing: 'border-box', resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {stickyColors.map(s => (
              <div key={s.id} onClick={() => setStickyColor(s.id)} style={{
                width: '48px', height: '48px', borderRadius: '10px',
                cursor: 'pointer', overflow: 'hidden',
                border: stickyColor === s.id ? '3px solid var(--accent)' : '3px solid transparent',
                background: s.bg || 'transparent',
              }}>
                {s.img && <img src={s.img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={addSticky} style={btnStyle('primary')}>Add ✨</button>
            <button onClick={() => setAddingSticky(false)} style={btnStyle('ghost')}>Cancel</button>
          </div>
        </div>
      )}

      {/* Notebooks grid */}
      {view === 'home' && (
        notebooks.length === 0
          ? <EmptyState icon="📓" text="No notebooks yet — tap + New Notebook!" />
          : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(150px,42vw),1fr))', gap: '1.25rem' }}>
              {notebooks.map(nb => (
                <NotebookCard key={nb.id} nb={nb}
                  onOpen={() => setOpenNotebook(nb)}
                  onDelete={e => { e.stopPropagation(); deleteNotebook(nb.id) }} />
              ))}
            </div>
      )}

      {/* Stickies grid */}
      {view === 'sticky' && (
        stickies.length === 0
          ? <EmptyState icon="🗒️" text="No sticky notes yet — tap + New Sticky!" />
          : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(170px,44vw),1fr))', gap: '1rem' }}>
              {stickies.map(s => {
                const st = getSticky(s.color)
                const isEditing = editingSticky === s.id
                return (
                  <div key={s.id} style={{
                    position: 'relative', borderRadius: '12px', overflow: 'hidden',
                    minHeight: '150px', background: st?.bg || 'transparent',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.13)',
                  }}>
                    {st?.img && <img src={st.img} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} alt="" />}
                    <div style={{ position: 'relative', zIndex: 1, padding: '1rem' }}>
                      {isEditing ? (
                        <>
                          <textarea
                            value={editStickyText}
                            onChange={e => setEditStickyText(e.target.value)}
                            autoFocus
                            style={{ width: '100%', minHeight: '80px', fontSize: '0.88rem', background: 'rgba(255,255,255,0.75)', border: '1.5px solid rgba(0,0,0,0.2)', borderRadius: '8px', padding: '0.4rem', resize: 'vertical', boxSizing: 'border-box' }}
                          />
                          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                            <button onClick={saveEditSticky} style={{ ...btnStyle('primary'), fontSize: '0.72rem', padding: '0.3rem 0.7rem' }}>✅ Save</button>
                            <button onClick={() => setEditingSticky(null)} style={{ ...btnStyle('ghost'), fontSize: '0.72rem', padding: '0.3rem 0.7rem' }}>Cancel</button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p style={{ fontSize: '0.88rem', color: st?.bg ? '#333' : '#fff', whiteSpace: 'pre-wrap', marginBottom: '0.6rem', marginTop: 0 }}>{s.text}</p>
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <button onClick={() => startEditSticky(s)} style={{ background: 'rgba(255,255,255,0.65)', color: '#333', border: 'none', borderRadius: '8px', padding: '0.25rem 0.6rem', fontSize: '0.72rem', cursor: 'pointer' }}>✏️ Edit</button>
                            <button onClick={() => deleteSticky(s.id)} style={{ background: 'rgba(220,50,50,0.7)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.25rem 0.6rem', fontSize: '0.72rem', cursor: 'pointer' }}>🗑️ Delete</button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
      )}

      <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} textarea,input{-webkit-appearance:none;} button{-webkit-tap-highlight-color:transparent;touch-action:manipulation;}`}</style>
    </div>
  )
}

// ── Helper components ────────────────────────────────────────────────────────
function NotebookCard({ nb, onOpen, onDelete }) {
  const cover = covers.find(c => c.id === nb.cover)
  return (
    <div onClick={onOpen} style={{ position: 'relative', cursor: 'pointer', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.18)' }}>
      <img src={cover?.img} alt={nb.title} style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', display: 'block' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.62) 0%, transparent 100%)', borderRadius: '0 0 12px 12px', padding: '1.5rem 0.6rem 0.5rem', color: '#fff', fontSize: '0.82rem', fontWeight: 700 }}>{nb.title}</div>
      <button onClick={onDelete} style={{ position: 'absolute', top: '0.4rem', right: '0.4rem', background: 'rgba(220,50,50,0.82)', color: '#fff', border: 'none', borderRadius: '50%', width: '28px', height: '28px', fontSize: '13px', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
    </div>
  )
}

function SpiralDivider() {
  return (
    <div style={{ width: '28px', background: '#e8e8e8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-around', padding: '12px 0', flexShrink: 0 }}>
      {Array.from({ length: 16 }).map((_, i) => (
        <div key={i} style={{ width: '18px', height: '12px', border: '2.5px solid #aaa', borderRadius: '50%', background: '#f5f5f5' }} />
      ))}
    </div>
  )
}

function SectionLabel({ children }) {
  return <p style={{ fontWeight: 700, marginBottom: '0.5rem', marginTop: 0, color: 'var(--ink)', fontSize: '0.88rem' }}>{children}</p>
}

function EmptyState({ icon, text }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--ink2,#aaa)', fontSize: '0.95rem' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{icon}</div>
      <p style={{ margin: 0 }}>{text}</p>
    </div>
  )
}

function btnStyle(variant) {
  const base = { border: 'none', borderRadius: '10px', padding: '0.5rem 1rem', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.88rem', minHeight: '40px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.15s', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }
  if (variant === 'primary') return { ...base, background: 'var(--accent,#e8a0bf)', color: '#fff' }
  if (variant === 'ghost')   return { ...base, background: 'var(--surface,#f7f7f7)', color: 'var(--ink,#333)', border: '1.5px solid var(--border,#ddd)' }
  return base
}

function textareaStyle(nb, topPad) {
  return {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    background: 'transparent', border: 'none', outline: 'none',
    fontSize: 'clamp(0.9rem,3.5vw,1rem)',
    lineHeight: (nb.page === 'dotted' || nb.page === 'grid') ? '24px' : '32px',
    fontFamily: 'Quicksand, sans-serif',
    color: '#333', resize: 'none',
    padding: `${topPad} 1.2rem 1.5rem 1.2rem`,
    width: '100%', height: '100%',
    boxSizing: 'border-box',
    WebkitOverflowScrolling: 'touch',
  }
}