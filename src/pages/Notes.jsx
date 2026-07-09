import { useState, useEffect, useRef, useCallback } from 'react'
import HTMLFlipBook from 'react-pageflip'
import React, { forwardRef } from 'react'
import { Document, Page as PdfPage, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// This sets up the PDF worker so your browser can process the dropped PDFs
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

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
  
  // Notice zIndex: 0 - This ensures the background stays strictly at the bottom layer
  const base = { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: bg, zIndex: 0 }
  
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
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '60px', background: '#8b0000', display: 'flex', alignItems: 'center', padding: '0 1rem', gap: '0.5rem', zIndex: 1 }}>
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
// ── AUDIO RECORDER ──────────────────────────────────────────────────────────
function AudioRecorder({ onSaveAudio }) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorder = useRef(null)
  const audioChunks = useRef([])
  const timer = useRef(null)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorder.current = new MediaRecorder(stream)
      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data)
      }
      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(audioBlob)
        onSaveAudio(url)
        audioChunks.current = []
      }
      mediaRecorder.current.start()
      setIsRecording(true)
      setRecordingTime(0)
      timer.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000)
    } catch (err) {
      alert("Microphone access is required to record audio.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop()
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop())
      clearInterval(timer.current)
      setIsRecording(false)
    }
  }

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface, #f5f5f5)', padding: '0.4rem 0.8rem', borderRadius: '20px', border: '1.5px solid var(--border, #eee)' }}>
      {!isRecording ? (
        <button onClick={startRecording} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
          🎙️ Record Lecture
        </button>
      ) : (
        <>
          <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '0.8rem', animation: 'pulse 1s infinite' }}>🔴 {formatTime(recordingTime)}</span>
          <button onClick={stopRecording} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.2rem 0.6rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
            Stop
          </button>
        </>
      )}
      <style>{`@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }`}</style>
    </div>
  )
}

// ── DRAGGABLE STICKY & STICKER ──────────────────────────────────────────────
function DraggableItem({ item, updatePosition, onDelete, onEdit }) {
  const [pos, setPos] = useState({ x: item.x || 20, y: item.y || 20 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })

  const handlePointerDown = (e) => {
    setIsDragging(true)
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    dragStart.current = { x: clientX - pos.x, y: clientY - pos.y }
    e.stopPropagation()
  }

  const handlePointerMove = (e) => {
    if (!isDragging) return
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    setPos({ x: clientX - dragStart.current.x, y: clientY - dragStart.current.y })
    e.preventDefault()
  }

  const handlePointerUp = () => {
    if (isDragging) {
      setIsDragging(false)
      updatePosition(item.id, pos.x, pos.y)
    }
  }

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handlePointerMove)
      window.addEventListener('mouseup', handlePointerUp)
      window.addEventListener('touchmove', handlePointerMove, { passive: false })
      window.addEventListener('touchend', handlePointerUp)
      return () => {
        window.removeEventListener('mousemove', handlePointerMove)
        window.removeEventListener('mouseup', handlePointerUp)
        window.removeEventListener('touchmove', handlePointerMove)
        window.removeEventListener('touchend', handlePointerUp)
      }
    }
  }, [isDragging, pos])

  return (
    <div
      onMouseDown={handlePointerDown}
      onTouchStart={handlePointerDown}
      style={{
        position: 'absolute', left: pos.x, top: pos.y, zIndex: 10,
        cursor: isDragging ? 'grabbing' : 'grab',
        boxShadow: isDragging ? '0 8px 25px rgba(0,0,0,0.2)' : '0 4px 10px rgba(0,0,0,0.1)',
        transform: isDragging ? 'scale(1.02)' : 'scale(1)',
        transition: isDragging ? 'none' : 'transform 0.1s, box-shadow 0.1s',
      }}
    >
      {/* Delete Button */}
      <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '50%', width: '22px', height: '22px', fontSize: '10px', cursor: 'pointer', zIndex: 11 }}>✕</button>
      
      {item.type === 'image' ? (
        <img src={item.src} alt="sticker" style={{ maxWidth: '150px', maxHeight: '150px', borderRadius: '8px', pointerEvents: 'none' }} />
      ) : (
        <div style={{ background: item.color || '#fff9c4', padding: '0.8rem', borderRadius: '8px', minWidth: '120px', minHeight: '120px', position: 'relative' }}>
           <p style={{ margin: 0, fontSize: '0.85rem', color: '#333', whiteSpace: 'pre-wrap', pointerEvents: 'none' }}>{item.text}</p>
           <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} style={{ position: 'absolute', bottom: '5px', right: '5px', background: 'rgba(0,0,0,0.1)', border: 'none', borderRadius: '4px', padding: '2px 5px', fontSize: '0.65rem', cursor: 'pointer' }}>✏️</button>
        </div>
      )}
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
    // CHANGED: We no longer fill the background with color so it remains transparent!
    ctx.clearRect(0, 0, canvas.width, canvas.height) 
    
    if (existingDrawing) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0)
      img.src = existingDrawing
    }
  }, [existingDrawing])

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

  const startDraw = (e) => {
    e.preventDefault()
    const canvas = canvasRef.current
    const pos = getPos(e, canvas)
    lastPos.current = pos
    setDrawing(true)
    const ctx = canvas.getContext('2d')
    
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.lineWidth = penSize * 4
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = penColor
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, penSize / 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const draw = (e) => {
    e.preventDefault()
    if (!drawing || !lastPos.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.lineWidth = penSize * 4
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = penColor
      ctx.lineWidth = penSize
    }
    
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    lastPos.current = pos
  }

  const stopDraw = (e) => { e?.preventDefault(); setDrawing(false); lastPos.current = null }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
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
        background: '#fff', borderRadius: '16px', padding: '0.6rem 0.9rem', marginBottom: '0.6rem',
        display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', width: '100%', maxWidth: '600px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)', boxSizing: 'border-box',
      }}>
        <button onClick={() => setTool('pen')} style={{ ...tBtn, background: tool === 'pen' ? 'var(--accent,#e91e8c)' : '#f5f5f5', color: tool === 'pen' ? '#fff' : '#333' }}>✏️ Pen</button>
        <button onClick={() => setTool('eraser')} style={{ ...tBtn, background: tool === 'eraser' ? 'var(--accent,#e91e8c)' : '#f5f5f5', color: tool === 'eraser' ? '#fff' : '#333' }}>🧹 Eraser</button>
        <input type="range" min="1" max="20" value={penSize} onChange={e => setPenSize(Number(e.target.value))} style={{ width: '65px', accentColor: 'var(--accent,#e91e8c)' }} />
        <span style={{ fontSize: '0.72rem', color: '#888', minWidth: '24px' }}>{penSize}px</span>

        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          {PEN_COLORS.map(c => (
            <div key={c} onClick={() => { setPenColor(c); setTool('pen') }} style={{ width: '22px', height: '22px', borderRadius: '50%', background: c, cursor: 'pointer', boxSizing: 'border-box', border: penColor === c && tool === 'pen' ? '3px solid var(--accent,#e91e8c)' : '2px solid #ccc' }} />
          ))}
        </div>
        <button onClick={clearCanvas} style={{ ...tBtn, background: '#fee2e2', color: '#dc2626', marginLeft: 'auto' }}>🗑️ Clear</button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef} width={600} height={750}
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
        style={{
          borderRadius: '12px', width: '100%', maxWidth: '600px', maxHeight: '58vh', touchAction: 'none', display: 'block',
          cursor: tool === 'eraser' ? 'cell' : 'crosshair', boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          background: 'var(--surface, #fff)', // Canvas appears white while drawing, but exports transparent!
        }}
      />

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.7rem' }}>
        <button onClick={onClose} style={{ padding: '0.65rem 1.4rem', borderRadius: '12px', background: '#f5f5f5', color: '#333', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>✕ Cancel</button>
        <button onClick={() => onSave(canvasRef.current.toDataURL('image/png'))} style={{ padding: '0.65rem 1.4rem', borderRadius: '12px', background: 'var(--accent,#e91e8c)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', boxShadow: '0 4px 12px rgba(233,30,140,0.35)' }}>💾 Save Drawing</button>
      </div>
    </div>
  )
}

const tBtn = { padding: '0.35rem 0.75rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem' }
export default function Notes() {
  const [notebooks,      setNotebooks]      = useState(() => loadFromStorage(STORAGE_KEY_NOTEBOOKS, []))
  const [view,           setView]           = useState('home')
  const [openNotebook,   setOpenNotebook]   = useState(null)
  const [creating,       setCreating]       = useState(false)
  const [newTitle,       setNewTitle]       = useState('')
  const [newCover,       setNewCover]       = useState('campus')
  const [newPage,        setNewPage]        = useState('ruled')
  const [newColor,       setNewColor]       = useState('cream')
  const [bookView,       setBookView]       = useState('single')
  const [saveStatus,     setSaveStatus]     = useState(null)
  const [showCanvas,     setShowCanvas]     = useState(false)
  
  // ── NEW: In-Notebook Draggable Stickies States ──
  const [addingSticky,   setAddingSticky]   = useState(false)
  const [stickyText,     setStickyText]     = useState('')
  const [stickyColor,    setStickyColor]    = useState('yellow')

  const autosaveTimer = useRef(null)
  const toastTimer    = useRef(null)
  const imageInputRef = useRef(null) // For uploading gallery stickers
  const pdfInputRef   = useRef(null) // For importing PDFs

  useEffect(() => {
    const ok = saveToStorage(STORAGE_KEY_NOTEBOOKS, notebooks)
    if (!ok) showToast('error')
  }, [notebooks])

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
      // NEW ARRAYS AND FIELDS FOR UPGRADED FEATURES
      draggables: [],   // Stores stickies & stickers for this notebook
      audioFile: null,  // Stores lecture recording URL
      pdfBg: null,      // Stores imported PDF URL
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

  function updateNotebookField(id, field, value) {
    setNotebooks(prev => prev.map(n => n.id === id ? { ...n, [field]: value } : n))
    scheduleAutosave()
  }

  // ── DRAWING LOGIC ─────────────────────────────────────────────────────────

  function saveDrawing(dataUrl) {
    updateNotebookField(openNotebook.id, 'drawing', dataUrl)
    setShowCanvas(false)
    showToast('saved')
  }

  function deleteDrawing() {
    updateNotebookField(openNotebook.id, 'drawing', null)
    showToast('saved')
  }

  // ── AUDIO LECTURE LOGIC ───────────────────────────────────────────────────

  function saveAudioRecord(url) {
    updateNotebookField(openNotebook.id, 'audioFile', url)
    showToast('saved')
  }

  // ── PDF & STICKER UPLOAD LOGIC ────────────────────────────────────────────

  function handlePdfUpload(e) {
    const file = e.target.files[0]
    if (!file || file.type !== 'application/pdf') {
      alert("Please upload a valid PDF file.")
      return
    }
    const fileUrl = URL.createObjectURL(file)
    updateNotebookField(openNotebook.id, 'pdfBg', fileUrl)
    showToast('saved')
  }

  function handleImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const newItem = {
        id: Date.now(), type: 'image', src: event.target.result,
        x: 50, y: 50 // Spawn slightly offset from top-left
      }
      const updatedDraggables = [...(openNotebook.draggables || []), newItem]
      updateNotebookField(openNotebook.id, 'draggables', updatedDraggables)
      showToast('saved')
    }
    reader.readAsDataURL(file)
  }

  // ── DRAGGABLE STICKIES LOGIC ──────────────────────────────────────────────

  function addInNotebookSticky() {
    if (!stickyText.trim()) return
    const newItem = {
      id: Date.now(), type: 'text', text: stickyText.trim(),
      color: stickyColors.find(s => s.id === stickyColor)?.bg || '#fff9c4',
      x: 60, y: 60
    }
    const updatedDraggables = [...(openNotebook.draggables || []), newItem]
    updateNotebookField(openNotebook.id, 'draggables', updatedDraggables)
    setStickyText('')
    setAddingSticky(false)
    showToast('saved')
  }

  function updateDraggablePos(itemId, newX, newY) {
    const updated = (openNotebook.draggables || []).map(item => 
      item.id === itemId ? { ...item, x: newX, y: newY } : item
    )
    updateNotebookField(openNotebook.id, 'draggables', updated)
  }

  function deleteDraggable(itemId) {
    const updated = (openNotebook.draggables || []).filter(item => item.id !== itemId)
    updateNotebookField(openNotebook.id, 'draggables', updated)
  }

  const topPad = openNotebook?.page === 'cherry' ? '70px' : '1.5rem'
  // ── OPEN NOTEBOOK VIEW ──────────────────────────────────────────────────
  if (openNotebook) {
    return (
      <div style={{ paddingBottom: '2rem' }}>
        <SaveToast status={saveStatus} />

        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap',
          position: 'sticky', top: 0, zIndex: 50, background: 'var(--surface, #fff)',
          padding: '0.6rem 0', borderBottom: '1px solid var(--border, #eee)',
        }}>
          <button onClick={() => { setOpenNotebook(null); setShowCanvas(false) }} style={btnStyle('ghost')}>← Back</button>
          
          <h2 style={{ color: 'var(--accent)', margin: 0, fontSize: 'clamp(1rem,4vw,1.3rem)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {openNotebook.title}
          </h2>
          
          {/* NEW: Audio Recorder Integration */}
          <AudioRecorder onSaveAudio={saveAudioRecord} />

          <button onClick={manualSave} style={{ ...btnStyle('primary'), fontSize: '0.78rem', padding: '0.4rem 0.85rem' }}>💾 Save</button>
          
          <button onClick={() => setBookView('single')} style={{ ...btnStyle(bookView === 'single' ? 'primary' : 'ghost'), fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}>📄</button>
          <button onClick={() => setBookView('double')} style={{ ...btnStyle(bookView === 'double' ? 'primary' : 'ghost'), fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}>📖</button>
          <button onClick={() => setShowCanvas(true)} style={{ ...btnStyle('ghost'), fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}>✏️ Draw</button>
          
          {/* NEW: Insert PDF, Image, and Sticky Buttons */}
          <input type="file" accept="application/pdf" ref={pdfInputRef} style={{ display: 'none' }} onChange={handlePdfUpload} />
          <button onClick={() => pdfInputRef.current.click()} style={{ ...btnStyle('ghost'), fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}>📄 Drop PDF</button>
          
          <input type="file" accept="image/*" ref={imageInputRef} style={{ display: 'none' }} onChange={handleImageUpload} />
          <button onClick={() => imageInputRef.current.click()} style={{ ...btnStyle('ghost'), fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}>🖼️ Sticker</button>

          <button onClick={() => setAddingSticky(true)} style={{ ...btnStyle('ghost'), fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}>🗒️ Sticky</button>
        </div>

        {/* NEW: Audio Player (Shows up if a lecture is recorded) */}
        {openNotebook.audioFile && (
          <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', background: '#f9fafb', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4b5563' }}>🎧 Lecture Audio:</span>
            <audio src={openNotebook.audioFile} controls style={{ height: '35px', flex: 1 }} />
            <button onClick={() => updateNotebookField(openNotebook.id, 'audioFile', null)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>🗑️ Remove</button>
          </div>
        )}

        {/* NEW: In-Notebook Sticky Creation Dock */}
        {addingSticky && (
          <div style={{ background: '#fff', padding: '1rem', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start', border: '1px solid var(--border,#eee)' }}>
            <textarea value={stickyText} onChange={e => setStickyText(e.target.value)} placeholder="Type your sticky note..." autoFocus style={{ flex: 1, minHeight: '60px', padding: '0.6rem', borderRadius: '8px', border: '1.5px solid #ccc', fontSize: '0.9rem', resize: 'vertical' }} />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                {stickyColors.filter(s => s.bg).map(s => (
                  <div key={s.id} onClick={() => setStickyColor(s.id)} style={{ width: '24px', height: '24px', borderRadius: '50%', background: s.bg, cursor: 'pointer', border: stickyColor === s.id ? '2px solid #333' : '1px solid #ccc' }} />
                ))}
              </div>
              <button onClick={addInNotebookSticky} style={{ ...btnStyle('primary'), padding: '0.4rem 1rem' }}>Paste Note ✨</button>
              <button onClick={() => setAddingSticky(false)} style={{ ...btnStyle('ghost'), padding: '0.4rem 1rem' }}>Cancel</button>
            </div>
          </div>
        )}

        {/* THE NEW LAYERED NOTEBOOK PAGES */}
        {/* THE NEW LAYERED NOTEBOOK PAGES (Upgraded with 3D Flip & React-PDF) */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '2rem auto' }}>
          <HTMLFlipBook 
            width={450} 
            height={650} 
            size="fixed" 
            minWidth={300} 
            maxWidth={600} 
            minHeight={400} 
            maxHeight={800} 
            showCover={true} 
            mobileScrollSupport={true}
            style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}
          >
            {/* PAGE 1 */}
            <BookPage>
              {/* Layer 0: Background Paper OR Uploaded PDF */}
              {openNotebook.pdfBg ? (
                <Document file={openNotebook.pdfBg} loading="Loading PDF...">
                  <PdfPage pageNumber={1} width={450} renderTextLayer={false} renderAnnotationLayer={false} />
                </Document>
              ) : (
                <PageBackground style={openNotebook.page} color={openNotebook.color} />
              )}
              
              {/* Layer 1: Typed Text Area (Transparent) */}
              <textarea
                value={openNotebook.content}
                onChange={e => updateNotebookField(openNotebook.id, 'content', e.target.value)}
                placeholder={openNotebook.pdfBg ? "" : "Start writing…"}
                style={{ ...textareaStyle(openNotebook, topPad), zIndex: 1 }}
              />

              {/* Layer 2: Saved Transparent Hand-drawing */}
              {openNotebook.drawing && (
                <img src={openNotebook.drawing} alt="Drawing Layer" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }} />
              )}

              {/* Layer 3: Draggables (Stickies & Gallery Stickers) */}
              {(openNotebook.draggables || []).map(item => (
                <DraggableItem key={item.id} item={item} updatePosition={updateDraggablePos} onDelete={deleteDraggable} onEdit={() => {}} />
              ))}
            </BookPage>

            {/* PAGE 2 */}
            {bookView === 'double' && (
              <BookPage>
                {openNotebook.pdfBg ? (
                  <Document file={openNotebook.pdfBg} loading="Loading PDF...">
                    <PdfPage pageNumber={2} width={450} renderTextLayer={false} renderAnnotationLayer={false} />
                  </Document>
                ) : (
                  <PageBackground style={openNotebook.page} color={openNotebook.color} />
                )}
                <textarea
                  value={openNotebook.content2}
                  onChange={e => updateNotebookField(openNotebook.id, 'content2', e.target.value)}
                  placeholder="Continue writing…"
                  style={{ ...textareaStyle(openNotebook, topPad), zIndex: 1 }}
                />
              </BookPage>
            )}
          </HTMLFlipBook>
        </div>
      

        <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--ink2,#999)', marginTop: '0.6rem' }}>
          {(openNotebook.content + ' ' + openNotebook.content2).trim().split(/\s+/).filter(Boolean).length} words
        </p>

        {/* Drawing canvas modal */}
        {showCanvas && (
          <DrawingCanvas
            pageColor={openNotebook.color}
            existingDrawing={openNotebook.drawing || null}
            onClose={() => setShowCanvas(false)}
            onSave={saveDrawing}
          />
        )}
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
          <button onClick={() => setCreating(true)}
            style={{ ...btnStyle('primary'), fontSize: '0.82rem' }}>
            + New Notebook
          </button>
        </div>
      </div>

      {/* Create notebook form */}
      {creating && (
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

      {/* Notebooks grid */}
      {notebooks.length === 0
        ? <EmptyState icon="📓" text="No notebooks yet — tap + New Notebook!" />
        : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(150px,42vw),1fr))', gap: '1.25rem' }}>
            {notebooks.map(nb => (
              <NotebookCard key={nb.id} nb={nb}
                onOpen={() => setOpenNotebook(nb)}
                onDelete={e => { e.stopPropagation(); deleteNotebook(nb.id) }} />
            ))}
          </div>
      }

      <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} textarea,input{-webkit-appearance:none;} button{-webkit-tap-highlight-color:transparent;touch-action:manipulation;}`}</style>
    </div>
  )
}

// ── Helper components ────────────────────────────────────────────────────────
const BookPage = forwardRef((props, ref) => {
  return (
    <div ref={ref} style={{ 
      background: '#fff', 
      overflow: 'hidden', 
      position: 'relative', 
      width: '100%', 
      height: '100%', 
      boxShadow: 'inset 0 0 20px rgba(0,0,0,0.05)' // Adds a subtle shadow to the spine of the book
    }}>
      {props.children}
    </div>
  )
})
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