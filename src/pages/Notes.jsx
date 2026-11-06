import { useState, useEffect, useRef, useCallback } from 'react'
import { BlockNoteSchema, filterSuggestionItems } from '@blocknote/core'
import { createReactBlockSpec, useCreateBlockNote, SuggestionMenuController, getDefaultReactSlashMenuItems } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'
import { getStroke } from 'perfect-freehand'
import { Document, Page as PdfPage, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

const KEY = 'studybuddy_notes_v2'
const OLD_KEY = 'studybuddy_notebooks'
const IMPORTED_FLAG = 'studybuddy_notes_v2_imported'
const INK = '#1f2430'
const MUTED = '#8a8f9c'
const LINE = '#e9eaee'
const ACCENT = '#be185d'

/* ---------- storage ---------- */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
const blank = () => ({ id: uid(), title: '', html: '', updated: Date.now(), pageStyle: 'plain', pageColor: 'white', stickies: [], cover: 'campus' })
const persist = (list) => { try { localStorage.setItem(KEY, JSON.stringify(list)) } catch (e) { console.warn('Save failed', e) } }
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const plain = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

// Copies old notebooks into the new format. The old data is never touched or deleted.
function collectText(v, out) {
  if (!v) return
  if (Array.isArray(v)) return v.forEach((x) => collectText(x, out))
  if (typeof v === 'object') {
    for (const k of Object.keys(v)) {
      if (/content|text|html|body|notes/i.test(k) && typeof v[k] === 'string') out.push(v[k])
      else if (typeof v[k] === 'object') collectText(v[k], out)
    }
  }
}
function importOld() {
  try {
    if (localStorage.getItem(IMPORTED_FLAG)) return []
    localStorage.setItem(IMPORTED_FLAG, '1')
    const old = JSON.parse(localStorage.getItem(OLD_KEY) || '[]')
    if (!Array.isArray(old)) return []
    return old.map((nb) => {
      const texts = []
      collectText(nb.pages || nb, texts)
      const html = texts
        .filter((t) => t.trim())
        .map((t, i) => `<h3>Page ${i + 1}</h3>` + (/<[a-z][\s\S]*>/i.test(t) ? t : `<p>${esc(t).replace(/\n/g, '<br>')}</p>`))
        .join('')
      return { id: uid(), title: nb.title || nb.name || 'Imported notebook', html, updated: Date.now() }
    })
  } catch { return [] }
}

/* ---------- drawing block ---------- */
const strokePath = (pts, size = 3.5) => {
  const s = getStroke(pts, { size, thinning: 0.6, smoothing: 0.5, streamline: 0.5 })
  if (!s.length) return ''
  const d = s.reduce((a, [x0, y0], i, arr) => {
    const [x1, y1] = arr[(i + 1) % arr.length]
    a.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
    return a
  }, ['M', ...s[0], 'Q'])
  d.push('Z')
  return d.join(' ')
}
const PEN_COLORS = ['#1f2430', '#be185d', '#2563eb', '#16a34a', '#f59e0b']
const SIZES = [['S', 2.5], ['M', 4.5], ['L', 8]]

const getScroller = (el) => {
  let p = el?.parentElement
  while (p) {
    const o = getComputedStyle(p).overflowY
    if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight) return p
    p = p.parentElement
  }
  return document.scrollingElement
}

function DrawingView({ block, editor }) {
  const updateAttributes = (props) => editor.updateBlock(block, { props })
  const deleteNode = () => editor.removeBlocks([block])
  const selected = false
  const strokes = JSON.parse(block.props.paths || '[]')
  const H = block.props.h || 300
  const [live, setLive] = useState(null)
  const [tool, setTool] = useState('pen')
  const [color, setColor] = useState(PEN_COLORS[0])
  const [size, setSize] = useState(1)
  const [penOnly, setPenOnly] = useState(false)
  const [editing, setEditing] = useState(() => (block.props.paths || '[]') === '[]')
  const liveRef = useRef(null)
  const svgRef = useRef(null)
  const erasing = useRef(false)
  const pan = useRef(null)
  const strokesRef = useRef(strokes)
  strokesRef.current = strokes

  const pt = (e) => {
    const r = svgRef.current.getBoundingClientRect()
    return [((e.clientX - r.left) / r.width) * 800, ((e.clientY - r.top) / r.height) * H, e.pressure || 0.5]
  }
  const eraseAt = ([x, y]) => {
    const next = strokesRef.current.filter((s) => !s.p.some(([a, b]) => Math.hypot(a - x, b - y) < 16))
    if (next.length !== strokesRef.current.length) {
      strokesRef.current = next
      updateAttributes({ paths: JSON.stringify(next) })
    }
  }
  const down = (e) => {
    if (!editing) return
    if (e.pointerType === 'pen' && !penOnly) setPenOnly(true) // a stylus was detected: turn on palm rejection
    if ((penOnly || e.pointerType === 'pen') && e.pointerType === 'touch') {
      // finger or palm: scroll the page instead of drawing
      e.currentTarget.setPointerCapture(e.pointerId)
      pan.current = e.clientY
      return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = pt(e)
    if (tool === 'eraser') { erasing.current = true; eraseAt(p); return }
    const base = SIZES[size][1]
    liveRef.current = { c: color, w: tool === 'marker' ? base * 4 : base, o: tool === 'marker' ? 0.35 : 1, p: [p] }
    setLive({ ...liveRef.current })
  }
  const move = (e) => {
    if (pan.current !== null) {
      const sc = getScroller(svgRef.current)
      if (sc) sc.scrollTop += pan.current - e.clientY
      pan.current = e.clientY
      return
    }
    if (erasing.current) return eraseAt(pt(e))
    if (!liveRef.current) return
    liveRef.current.p.push(pt(e))
    setLive({ ...liveRef.current })
  }
  const up = () => {
    pan.current = null
    erasing.current = false
    if (!liveRef.current) return
    updateAttributes({ paths: JSON.stringify([...strokesRef.current, liveRef.current]) })
    liveRef.current = null
    setLive(null)
  }
  const btn = (on) => ({ border: `1px solid ${on ? ACCENT : LINE}`, color: on ? ACCENT : INK, background: '#fff', borderRadius: 6, padding: '3px 9px', fontSize: 12, cursor: 'pointer' })

  return (
    <div contentEditable={false} style={{ width: '100%' }}>
      <div className="sb-draw" style={{ position: 'relative', border: `1px solid ${selected ? ACCENT : LINE}` }} contentEditable={false}>
        <div style={{ display: editing ? 'flex' : 'none', gap: 6, alignItems: 'center', padding: '6px 8px', borderBottom: `1px solid ${LINE}`, flexWrap: 'wrap', background: '#fff' }}>
          {[['pen', 'Pen'], ['marker', 'Marker'], ['eraser', 'Eraser']].map(([id, l]) => (
            <button key={id} style={btn(tool === id)} onClick={() => setTool(id)}>{l}</button>
          ))}
          <span style={{ width: 1, height: 18, background: LINE }} />
          {SIZES.map(([l], i) => <button key={l} style={btn(size === i)} onClick={() => setSize(i)}>{l}</button>)}
          <span style={{ width: 1, height: 18, background: LINE }} />
          {PEN_COLORS.map((c) => (
            <button key={c} onClick={() => { setColor(c); if (tool === 'eraser') setTool('pen') }} aria-label={`Colour ${c}`}
              style={{ width: 20, height: 20, borderRadius: '50%', background: c, border: color === c ? `2px solid ${ACCENT}` : '2px solid #fff', outline: `1px solid ${LINE}`, cursor: 'pointer' }} />
          ))}
          <span style={{ flex: 1 }} />
          <button style={btn(penOnly)} onClick={() => setPenOnly((v) => !v)} title="Only the pen draws; fingers scroll">Pen only</button>
          <button style={btn(false)} onClick={() => updateAttributes({ paths: JSON.stringify(strokes.slice(0, -1)) })}>Undo</button>
          <button style={btn(false)} onClick={() => updateAttributes({ paths: '[]' })}>Clear</button>
          <button style={btn(false)} onClick={() => updateAttributes({ h: H + 150 })}>Taller</button>
          <button style={btn(false)} disabled={H <= 200} onClick={() => updateAttributes({ h: Math.max(150, H - 150) })}>Shorter</button>
          <button style={btn(false)} onClick={deleteNode}>Delete</button>
          <button style={{ ...btn(true), fontWeight: 600 }} onClick={() => setEditing(false)}>Done ✓</button>
        </div>
        <svg ref={svgRef} viewBox={`0 0 800 ${H}`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
          style={{ width: '100%', aspectRatio: `800 / ${H}`, display: 'block', touchAction: editing ? 'none' : 'auto', cursor: !editing ? 'default' : tool === 'eraser' ? 'cell' : 'crosshair', background: 'rgba(255,255,255,.55)' }}>
          {strokes.map((s, i) => <path key={i} d={strokePath(s.p, s.w || 3.5)} fill={s.c} fillOpacity={s.o ?? 1} />)}
          {live && <path d={strokePath(live.p, live.w)} fill={live.c} fillOpacity={live.o} />}
        </svg>
        {!editing && <button style={{ ...btn(false), position: 'absolute', top: 8, right: 8 }} onClick={() => setEditing(true)}>✎ Edit drawing</button>}
      </div>
    </div>
  )
}

const createDrawing = createReactBlockSpec(
  { type: 'drawing', propSchema: { paths: { default: '[]' }, h: { default: 300 } }, content: 'none' },
  {
    render: (props) => <DrawingView block={props.block} editor={props.editor} />,
    parse: (el) => (el.getAttribute && el.getAttribute('data-drawing')
      ? { paths: el.getAttribute('data-drawing'), h: Number(el.getAttribute('data-h')) || 300 }
      : undefined),
  },
)
const schema = BlockNoteSchema.create().extend({ blockSpecs: { drawing: createDrawing() } })

const insertDrawing = (editor) => {
  const cur = editor.getTextCursorPosition().block
  const empty = cur.type === 'paragraph' && (!cur.content || cur.content.length === 0)
  if (empty) editor.updateBlock(cur, { type: 'drawing' })
  else editor.insertBlocks([{ type: 'drawing' }], cur, 'after')
}

const CSS = `
.bn-container.sb-bn{--bn-colors-editor-background:transparent !important;--bn-font-family:inherit !important;font-family:inherit}
.bn-container.sb-bn .bn-editor{padding-inline:var(--sb-gutter,54px) !important;background:transparent}
.sb-draw{border-radius:10px;margin:.4em 0;overflow:hidden;width:100%}
.sb-scroll::-webkit-scrollbar{display:none}
`

const blockText = (blocks) => (blocks || []).map((b) => (Array.isArray(b.content) ? b.content.map((c) => c.text || '').join('') : '') + ' ' + blockText(b.children)).join(' ')
const noteText = (n) => (n.blocks ? blockText(n.blocks) : plain(n.html || '')).replace(/\s+/g, ' ').trim()

const COVERS = [
  { id: 'campus', label: 'Campus', img: '/images/cover-campus.jpg', color: '#f9a8d4' },
  { id: 'bows', label: 'Bows', img: '/images/cover-bows.jpg', color: '#fbcfe8' },
  { id: 'minimal', label: 'Minimal', img: '/images/cover-minimal.jpg', color: '#d6c7b8' },
  { id: 'blue', label: 'Blue', img: '/images/cover-blue.jpg', color: '#93c5fd' },
  { id: 'bunny', label: 'Bunny', img: '/images/cover-bunny.jpg', color: '#fde68a' },
]
const PAGE_COLORS = [
  { id: 'white', label: 'White', bg: '#ffffff', line: '#e3e5ea' },
  { id: 'cream', label: 'Cream', bg: '#fdf6e3', line: '#e8d5a3' },
  { id: 'pink', label: 'Pink', bg: '#fff0f5', line: '#ffc2d4' },
  { id: 'blue', label: 'Blue', bg: '#f0f5ff', line: '#c3d3ff' },
  { id: 'green', label: 'Green', bg: '#f0fff4', line: '#bdeccc' },
  { id: 'yellow', label: 'Yellow', bg: '#fffdf0', line: '#f1deaa' },
]
const PAGE_STYLES = [['plain', 'Plain'], ['dotted', 'Dotted'], ['grid', 'Grid']]
const paperBg = (style, line) => {
  if (style === 'ruled') return { backgroundImage: `linear-gradient(transparent 27px, ${line} 27px)`, backgroundSize: '100% 28px' }
  if (style === 'dotted') return { backgroundImage: `radial-gradient(circle, ${line} 1.3px, transparent 1.5px)`, backgroundSize: '24px 24px' }
  if (style === 'grid') return { backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`, backgroundSize: '24px 24px' }
  return {}
}

const STICKY_COLORS = ['#fff9c4', '#ffd6e7', '#d4f5dd', '#e8d5f5', '#d6e8ff']

function Sticky({ s, onChange, onDelete }) {
  const [pos, setPos] = useState({ x: s.x, y: s.y })
  const [text, setText] = useState(s.text)
  const drag = useRef(null)
  const down = (e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y } }
  const move = (e) => {
    if (!drag.current) return
    setPos({
      x: Math.min(Math.max(0, e.clientX - drag.current.dx), window.innerWidth - 60),
      y: Math.min(Math.max(0, e.clientY - drag.current.dy), window.innerHeight - 60),
    })
  }
  const up = () => { if (!drag.current) return; drag.current = null; onChange({ ...s, ...pos, text }) }
  const nextColor = () => onChange({ ...s, ...pos, text, color: STICKY_COLORS[(STICKY_COLORS.indexOf(s.color) + 1) % STICKY_COLORS.length] })
  return (
    <div style={{ position: 'fixed', left: pos.x, top: pos.y, width: 200, zIndex: 30, background: s.color, borderRadius: 6, boxShadow: '0 6px 18px rgba(0,0,0,.18)', display: 'flex', flexDirection: 'column' }}>
      <div onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', cursor: 'grab', touchAction: 'none', borderBottom: '1px solid rgba(0,0,0,.08)' }}>
        <span style={{ flex: 1, fontSize: 12, color: 'rgba(0,0,0,.45)', userSelect: 'none' }}>Drag to move</span>
        <button onPointerDown={(e) => e.stopPropagation()} onClick={nextColor} aria-label="Change colour" style={{ width: 16, height: 16, borderRadius: '50%', border: '1px solid rgba(0,0,0,.25)', background: 'rgba(255,255,255,.7)', cursor: 'pointer' }} />
        <button onPointerDown={(e) => e.stopPropagation()} onClick={onDelete} aria-label="Delete sticky note" style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, color: 'rgba(0,0,0,.55)' }}>✕</button>
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} onBlur={() => onChange({ ...s, ...pos, text })} placeholder="Write a reminder…"
        style={{ height: 130, resize: 'none', border: 'none', outline: 'none', background: 'transparent', padding: 10, fontSize: 14, lineHeight: 1.45, fontFamily: 'inherit', color: INK }} />
    </div>
  )
}

function NoteEditor({ note, onChange, editorRef }) {
  const editor = useCreateBlockNote({ schema, initialContent: note.blocks && note.blocks.length ? note.blocks : undefined })
  useEffect(() => {
    editorRef.current = editor
    let live = true
    if (!note.blocks && note.html) {
      // convert a note saved by the earlier version
      Promise.resolve(editor.tryParseHTMLToBlocks(note.html))
        .then((b) => { if (live && b && b.length) editor.replaceBlocks(editor.document, b) })
        .catch(() => {})
    }
    return () => { live = false; editorRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])
  const drawingItem = {
    title: 'Drawing', subtext: 'Pen and handwriting area', aliases: ['draw', 'pen', 'sketch', 'handwriting'], group: 'Media',
    icon: <span style={{ fontSize: 16 }}>✎</span>, onItemClick: () => insertDrawing(editor),
  }
  return (
    <BlockNoteView editor={editor} theme="light" slashMenu={false} className="sb-bn" onChange={() => onChange(editor.document)}>
      <SuggestionMenuController triggerCharacter="/" getItems={async (query) => filterSuggestionItems([...getDefaultReactSlashMenuItems(editor), drawingItem], query)} />
    </BlockNoteView>
  )
}

export default function Notes() {
  const [notes, setNotes] = useState(() => {
    const cur = (() => { try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null } })()
    const list = cur && cur.length ? cur : importOld()
    persist(list)
    return list
  })
  const [activeId, setActiveId] = useState(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('Saved')
  const [narrow, setNarrow] = useState(window.innerWidth < 760)
  const [pdf, setPdf] = useState(null)
  const [showPdf, setShowPdf] = useState(false)
  const [pdfPages, setPdfPages] = useState(0)
  const [pdfPage, setPdfPage] = useState(1)
  const [pdfW, setPdfW] = useState(480)
  const [showPage, setShowPage] = useState(false)
  const [pdfMsg, setPdfMsg] = useState('')

  const pdfDocRef = useRef(null)
  const pendingRef = useRef(null)
  const timerRef = useRef(null)
  const activeRef = useRef(activeId)
  const editorRef = useRef(null)
  const pdfBoxRef = useRef(null)
  activeRef.current = activeId

  const patchNote = useCallback((id, patch) => {
    setNotes((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, ...patch, updated: Date.now() } : n))
      persist(next)
      return next
    })
    setStatus('Saved ✓')
  }, [])

  const onEdit = (blocks) => {
    const id = activeRef.current
    if (!id) return
    setStatus('Saving…')
    clearTimeout(timerRef.current)
    pendingRef.current = () => { patchNote(id, { blocks }); pendingRef.current = null }
    timerRef.current = setTimeout(() => pendingRef.current && pendingRef.current(), 600)
  }

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 760)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!showPdf || !pdfBoxRef.current) return
    const ro = new ResizeObserver(([e]) => setPdfW(Math.max(240, e.contentRect.width - 24)))
    ro.observe(pdfBoxRef.current)
    return () => ro.disconnect()
  }, [showPdf, pdf])

  const flush = () => { clearTimeout(timerRef.current); pendingRef.current && pendingRef.current() }
  const openNote = (id) => { flush(); setActiveId(id) }
  const goBack = () => { flush(); setShowPdf(false); setShowPage(false); setActiveId(null) }
  const addNote = () => {
    flush()
    const n = { ...blank(), cover: COVERS[notes.length % COVERS.length].id }
    setNotes((p) => { const next = [n, ...p]; persist(next); return next })
    setActiveId(n.id)
  }
  const removeNote = () => {
    if (!window.confirm('Delete this note? This cannot be undone.')) return
    clearTimeout(timerRef.current); pendingRef.current = null
    const rest = notes.filter((n) => n.id !== activeId)
    persist(rest); setNotes(rest); setShowPdf(false); setShowPage(false); setActiveId(null)
  }

  // PDF text -> note blocks
  const pdfPageParas = async (n) => {
    const pg = await pdfDocRef.current.getPage(n)
    const tc = await pg.getTextContent()
    let txt = ''
    for (const it of tc.items) { if (typeof it.str !== 'string') continue; txt += it.str; if (it.hasEOL) txt += '\n' }
    const lines = txt.split('\n').map((l) => l.trim()).filter(Boolean)
    if (!lines.length) return []
    const max = Math.max(...lines.map((l) => l.length))
    const paras = []
    let cur = ''
    lines.forEach((l) => {
      cur = cur ? (cur.endsWith('-') ? cur.slice(0, -1) + l : cur + ' ' + l) : l
      if (/[.:?!]$/.test(l) && l.length < max * 0.7) { paras.push(cur); cur = '' }
    })
    if (cur) paras.push(cur)
    return paras
  }
  const convertPdf = async (all) => {
    const ed = editorRef.current
    if (!ed || !pdfDocRef.current) return
    setPdfMsg('Converting…')
    try {
      const nums = all ? Array.from({ length: pdfPages }, (_, i) => i + 1) : [pdfPage]
      const blocks = []
      for (const n of nums) {
        const paras = await pdfPageParas(n)
        if (!paras.length) continue
        blocks.push({ type: 'heading', props: { level: 3 }, content: `PDF · Page ${n}` })
        paras.forEach((t) => blocks.push({ type: 'paragraph', content: t }))
      }
      if (!blocks.length) { setPdfMsg('No selectable text found. This PDF may be scanned (photos of pages). Converting those needs OCR, which is not added yet.'); return }
      ed.insertBlocks(blocks, ed.document[ed.document.length - 1], 'after')
      setPdfMsg(all ? `Added ${nums.length} pages at the end of your note ✓` : `Added page ${pdfPage} at the end of your note ✓`)
    } catch (e) { console.warn(e); setPdfMsg('Could not read this PDF.') }
  }

  const active = notes.find((n) => n.id === activeId) || null
  const pc = PAGE_COLORS.find((c) => c.id === active?.pageColor) || PAGE_COLORS[0]
  const paperStyle = paperBg(active?.pageStyle || 'plain', pc.line)
  const stickies = active?.stickies || []
  const setStickies = (fn) => setNotes((prev) => {
    const next = prev.map((n) => (n.id === activeRef.current ? { ...n, stickies: fn(n.stickies || []) } : n))
    persist(next)
    return next
  })
  const addSticky = () => setStickies((list) => [...list, { id: uid(), text: '', color: STICKY_COLORS[list.length % STICKY_COLORS.length], x: Math.max(20, window.innerWidth - 240), y: 130 + (list.length % 5) * 24 }])

  const shown = notes
    .filter((n) => !query || ((n.title || '') + ' ' + noteText(n)).toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.updated - a.updated)
  const topBtn = { border: `1px solid ${LINE}`, background: '#fff', color: INK, padding: '6px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }
  const on = (v) => (v ? { borderColor: ACCENT, color: ACCENT } : {})

  /* ---------- notebook shelf ---------- */
  if (!active) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', color: INK, padding: narrow ? '22px 16px' : '40px 48px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 26 }}>
            <h1 style={{ fontSize: narrow ? 26 : 32, margin: 0, flex: 1 }}>My Notes</h1>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notes"
              style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none', minWidth: 0, width: narrow ? '100%' : 220, order: narrow ? 3 : 0 }} />
            <button onClick={addNote} style={{ ...topBtn, background: ACCENT, color: '#fff', border: 'none', padding: '8px 14px' }}>+ New notebook</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 22 }}>
            <button onClick={addNote} style={{ aspectRatio: '3 / 4', border: `2px dashed ${LINE}`, borderRadius: 12, background: '#fafafb', color: MUTED, cursor: 'pointer', fontSize: 14 }}>
              <div style={{ fontSize: 34, lineHeight: 1 }}>＋</div>New notebook
            </button>
            {shown.map((n, i) => {
              const cv = COVERS.find((c) => c.id === n.cover) || COVERS[i % COVERS.length]
              return (
                <button key={n.id} onClick={() => openNote(n.id)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', padding: 0, color: INK }}>
                  <div style={{ aspectRatio: '3 / 4', borderRadius: '4px 12px 12px 4px', backgroundColor: cv.color, backgroundImage: `url(${cv.img})`, backgroundSize: 'cover', backgroundPosition: 'center', boxShadow: 'inset 8px 0 0 rgba(0,0,0,.14), 0 6px 16px rgba(0,0,0,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
                    <div style={{ background: 'rgba(255,255,255,.92)', borderRadius: 6, padding: '8px 10px', width: '100%', textAlign: 'center', fontWeight: 700, fontSize: 14, wordBreak: 'break-word' }}>{n.title || 'Untitled'}</div>
                  </div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {new Date(n.updated).toLocaleDateString()} · {noteText(n).slice(0, 30) || 'Empty'}
                  </div>
                </button>
              )
            })}
          </div>
          {shown.length === 0 && query && <div style={{ color: MUTED, marginTop: 24 }}>No notes match “{query}”.</div>}
        </div>
      </div>
    )
  }

  /* ---------- note view ---------- */
  return (
    <div className="sb-doc" style={{ display: 'flex', alignItems: 'flex-start', color: INK }}>
      <style>{CSS}</style>

      <main style={{ flex: 1, minWidth: 0, minHeight: '100vh', background: pc.bg }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#fff', borderBottom: `1px solid ${LINE}`, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', flexWrap: 'wrap' }}>
          <button onClick={goBack} style={topBtn} aria-label="Back to all notes">← Notes</button>
          <span style={{ fontSize: 12, color: MUTED }}>{status}</span>
          <span style={{ flex: 1 }} />
          <button onClick={() => editorRef.current?.undo?.()} style={topBtn} aria-label="Undo">↶</button>
          <button onClick={() => editorRef.current?.redo?.()} style={topBtn} aria-label="Redo">↷</button>
          <button onClick={() => editorRef.current && insertDrawing(editorRef.current)} style={topBtn}>✎ Draw</button>
          <button onClick={() => setShowPage((v) => !v)} style={{ ...topBtn, ...on(showPage) }}>Page</button>
          <button onClick={addSticky} style={topBtn}>Sticky</button>
          <button onClick={() => setShowPdf((v) => !v)} style={{ ...topBtn, ...on(showPdf) }}>PDF</button>
          <button onClick={removeNote} style={topBtn}>Delete</button>
        </div>

        <div style={{ maxWidth: 860, margin: '0 auto', '--sb-gutter': narrow ? '30px' : '54px' }}>
          <div style={{ ...paperStyle, padding: narrow ? '20px 0 140px' : '44px 0 180px', minHeight: '80vh' }}>
            <input value={active.title || ''} onChange={(e) => { setStatus('Saving…'); patchNote(active.id, { title: e.target.value }) }}
              placeholder="Untitled"
              style={{ width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', fontSize: narrow ? 28 : 38, fontWeight: 700, color: INK, background: 'transparent', marginBottom: 10, padding: '0 var(--sb-gutter)', fontFamily: 'inherit' }} />
            <NoteEditor key={active.id} note={active} onChange={onEdit} editorRef={editorRef} />
          </div>
        </div>
      </main>

      {showPdf && (
        <section style={{ width: narrow ? '100%' : '44%', position: narrow ? 'fixed' : 'sticky', top: 0, left: narrow ? 0 : 'auto', right: narrow ? 0 : 'auto', bottom: narrow ? 0 : 'auto', height: narrow ? 'auto' : '100vh', zIndex: 25, background: '#f3f4f6', borderLeft: `1px solid ${LINE}`, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#fff', borderBottom: `1px solid ${LINE}`, flexWrap: 'wrap' }}>
            <label style={{ ...topBtn, cursor: 'pointer' }}>
              {pdf ? 'Change PDF' : 'Open PDF'}
              <input type="file" accept="application/pdf" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) { setPdf(f); setPdfPage(1); setPdfMsg('') } e.target.value = '' }} />
            </label>
            {pdf && (
              <>
                <button style={topBtn} disabled={pdfPage <= 1} onClick={() => setPdfPage((p) => p - 1)}>‹</button>
                <span style={{ fontSize: 13 }}>{pdfPage} / {pdfPages || '–'}</span>
                <button style={topBtn} disabled={pdfPage >= pdfPages} onClick={() => setPdfPage((p) => p + 1)}>›</button>
                <button style={{ ...topBtn, color: ACCENT, borderColor: ACCENT }} onClick={() => convertPdf(false)}>Page → Note</button>
                <button style={{ ...topBtn, color: ACCENT, borderColor: ACCENT }} onClick={() => convertPdf(true)}>All → Note</button>
              </>
            )}
            <span style={{ flex: 1 }} />
            <button style={topBtn} onClick={() => setShowPdf(false)}>Close</button>
          </div>
          {pdfMsg && <div style={{ padding: '6px 12px', fontSize: 12, background: '#fff', color: MUTED, borderBottom: `1px solid ${LINE}` }}>{pdfMsg}</div>}
          <div ref={pdfBoxRef} style={{ flex: 1, overflow: 'auto', padding: 12 }}>
            {!pdf && <div style={{ color: MUTED, fontSize: 14, textAlign: 'center', marginTop: 60 }}>Open a PDF to read it next to your note.<br />Use “Page → Note” to copy its text into your note.</div>}
            {pdf && (
              <Document file={pdf} onLoadSuccess={(doc) => { pdfDocRef.current = doc; setPdfPages(doc.numPages); setPdfMsg('') }} loading="Loading PDF…" error="Could not open this PDF.">
                <PdfPage pageNumber={pdfPage} width={pdfW} />
              </Document>
            )}
          </div>
        </section>
      )}

      {showPage && (
        <div style={{ position: 'fixed', top: 52, right: 14, width: 250, zIndex: 40, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,.12)', padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Page style</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {PAGE_STYLES.map(([id, l]) => (
              <button key={id} onClick={() => patchNote(active.id, { pageStyle: id })} style={{ ...topBtn, ...on((active.pageStyle || 'plain') === id) }}>{l}</button>
            ))}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Page colour</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {PAGE_COLORS.map((c) => (
              <button key={c.id} onClick={() => patchNote(active.id, { pageColor: c.id })} aria-label={c.label} title={c.label}
                style={{ width: 30, height: 30, borderRadius: '50%', background: c.bg, border: pc.id === c.id ? `2px solid ${ACCENT}` : `1px solid ${LINE}`, cursor: 'pointer' }} />
            ))}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, margin: '14px 0 8px' }}>Cover</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {COVERS.map((c) => (
              <button key={c.id} onClick={() => patchNote(active.id, { cover: c.id })} aria-label={c.label} title={c.label}
                style={{ width: 30, height: 30, borderRadius: 6, background: c.color, border: active.cover === c.id ? `2px solid ${ACCENT}` : `1px solid ${LINE}`, cursor: 'pointer' }} />
            ))}
          </div>
        </div>
      )}

      {stickies.map((st) => (
        <Sticky key={st.id} s={st}
          onChange={(ns) => setStickies((list) => list.map((x) => (x.id === ns.id ? ns : x)))}
          onDelete={() => setStickies((list) => list.filter((x) => x.id !== st.id))} />
      ))}
    </div>
  )
}
