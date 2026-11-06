import { useState, useEffect, useRef } from 'react'
import { pdfjs } from 'react-pdf'
import { LEVELS, SUBJECTS, BUILT_IN } from '../utils/testBank'
import { askAI, extractQuestions, parseMcqs } from '../utils/testTools'

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

const PREFS = 'studybuddy_test_prefs'
const CUSTOM = 'studybuddy_test_custom'
const HIST = 'studybuddy_test_history'
const INK = '#1f2430'
const MUTED = '#8a8f9c'
const LINE = '#e9eaee'
const ACCENT = '#be185d'
const SOFT = '#fdf2f8'
const GREEN = '#16a34a'
const RED = '#dc2626'
const PURPLE = '#7c3aed'

const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) { console.warn(e) } }
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
const MARKINGS = [['+1 / 0', [1, 0]], ['+1 / −0.25', [1, 0.25]], ['+4 / −1 (NEET / JEE)', [4, 1]]]
const fmt = (s) => `${String(Math.floor(Math.max(0, s) / 60)).padStart(2, '0')}:${String(Math.max(0, s) % 60).padStart(2, '0')}`
const AI_OFF = 'The AI is not connected yet. We will switch this on when the AI Tutor is fixed. Built-in quizzes and PDF question papers work now.'

const card = { background: '#fff', border: `1px solid ${LINE}`, borderRadius: 14, padding: 16 }
const btn = { border: `1px solid ${LINE}`, background: '#fff', color: INK, padding: '9px 14px', borderRadius: 10, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }
const primary = { ...btn, background: ACCENT, color: '#fff', border: 'none', fontWeight: 600 }
const field = { width: '100%', boxSizing: 'border-box', border: `1px solid ${LINE}`, borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#fff' }

async function pdfToText(file) {
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
  let out = ''
  for (let i = 1; i <= doc.numPages; i++) {
    const tc = await (await doc.getPage(i)).getTextContent()
    for (const it of tc.items) { if (typeof it.str !== 'string') continue; out += it.str; if (it.hasEOL) out += '\n' }
    out += '\n'
  }
  return out
}

function scoreOf(test, ans) {
  let right = 0, wrong = 0, skipped = 0
  test.qs.forEach((q, k) => { if (ans[k] === undefined) skipped++; else if (ans[k] === q.a) right++; else wrong++ })
  const [mr, mw] = test.mark
  return { right, wrong, skipped, marks: Math.round((right * mr - wrong * mw) * 100) / 100, max: test.qs.length * mr }
}

/* ---------------- taking a test ---------------- */
function TakeTest({ test, onSubmit }) {
  const n = test.qs.length
  const [i, setI] = useState(0)
  const [ans, setAns] = useState({})
  const [marked, setMarked] = useState({})
  const [seen, setSeen] = useState({ 0: true })
  const [left, setLeft] = useState(test.minutes * 60)
  const startRef = useRef(Date.now())
  const doneRef = useRef(false)

  const submit = (auto) => {
    if (doneRef.current) return
    if (!auto) {
      const open = n - Object.keys(ans).length
      if (!window.confirm(`Submit the test?\n${Object.keys(ans).length} answered, ${open} unanswered.`)) return
    }
    doneRef.current = true
    onSubmit({ ans, seconds: Math.round((Date.now() - startRef.current) / 1000) })
  }
  useEffect(() => { const t = setInterval(() => setLeft((l) => l - 1), 1000); return () => clearInterval(t) }, [])
  useEffect(() => { if (left <= 0) submit(true) }) // eslint-disable-line react-hooks/exhaustive-deps

  const go = (k) => { setI(k); setSeen((s) => ({ ...s, [k]: true })) }
  const q = test.qs[i]
  const state = (k) => (marked[k] ? 'marked' : ans[k] !== undefined ? 'answered' : seen[k] ? 'seen' : 'new')
  const col = { marked: [PURPLE, '#fff'], answered: [GREEN, '#fff'], seen: ['#fee2e2', RED], new: ['#f3f4f6', INK] }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '14px 16px 60px' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 5, background: '#fff', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${LINE}`, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 140, fontWeight: 700 }}>{test.title}</div>
        <div style={{ fontWeight: 700, fontSize: 18, color: left < 60 ? RED : INK }}>⏱ {fmt(left)}</div>
        <button style={primary} onClick={() => submit(false)}>Submit</button>
      </div>

      <div style={{ display: 'flex', gap: 18, marginTop: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ ...card, flex: '1 1 320px', minWidth: 0 }}>
          <div style={{ fontSize: 13, color: MUTED, marginBottom: 8 }}>Question {i + 1} of {n}{q.ch ? ` · ${q.ch}` : ''}</div>
          <div style={{ fontSize: 17, lineHeight: 1.5, fontWeight: 600, marginBottom: 16 }}>{q.q}</div>
          {q.o.map((o, k) => {
            const on = ans[i] === k
            return (
              <button key={k} onClick={() => setAns((a) => ({ ...a, [i]: k }))}
                style={{ display: 'flex', gap: 10, width: '100%', textAlign: 'left', alignItems: 'flex-start', border: `2px solid ${on ? ACCENT : LINE}`, background: on ? SOFT : '#fff', borderRadius: 12, padding: '11px 14px', marginBottom: 8, cursor: 'pointer', fontSize: 15, color: INK, fontFamily: 'inherit' }}>
                <b style={{ color: on ? ACCENT : MUTED }}>{'ABCD'[k]}</b><span>{o}</span>
              </button>
            )
          })}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            <button style={btn} disabled={i === 0} onClick={() => go(i - 1)}>← Previous</button>
            <button style={{ ...btn, ...(marked[i] ? { borderColor: PURPLE, color: PURPLE } : {}) }} onClick={() => setMarked((m) => ({ ...m, [i]: !m[i] }))}>{marked[i] ? '★ Marked' : '☆ Mark for review'}</button>
            <button style={btn} disabled={ans[i] === undefined} onClick={() => setAns((a) => { const c = { ...a }; delete c[i]; return c })}>Clear answer</button>
            <button style={primary} disabled={i === n - 1} onClick={() => go(i + 1)}>Next →</button>
          </div>
        </div>

        <div style={{ ...card, flex: '0 1 250px', minWidth: 220 }}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>Question palette</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(38px, 1fr))', gap: 6 }}>
            {test.qs.map((_, k) => {
              const [bg, fg] = col[state(k)]
              return <button key={k} onClick={() => go(k)} style={{ height: 38, borderRadius: 8, border: k === i ? `2px solid ${INK}` : 'none', background: bg, color: fg, fontWeight: 600, cursor: 'pointer' }}>{k + 1}</button>
            })}
          </div>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 12, lineHeight: 1.8 }}>
            <span style={{ color: GREEN }}>■</span> Answered &nbsp;<span style={{ color: PURPLE }}>■</span> Marked<br />
            <span style={{ color: RED }}>■</span> Not answered &nbsp;<span style={{ color: '#9ca3af' }}>■</span> Not visited
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------------- result ---------------- */
function Result({ res, onRetake, onHome }) {
  const { test, ans, seconds, sc } = res
  const [filter, setFilter] = useState('all')
  const attempted = sc.right + sc.wrong
  const groups = {}
  test.qs.forEach((q, k) => {
    const g = q.ch || test.chapter || 'General'
    groups[g] = groups[g] || { right: 0, total: 0 }
    groups[g].total++
    if (ans[k] === q.a) groups[g].right++
  })
  const rows = test.qs.map((q, k) => ({ q, k })).filter(({ q, k }) =>
    filter === 'all' ? true : filter === 'wrong' ? ans[k] !== undefined && ans[k] !== q.a : ans[k] === undefined)

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px 60px' }}>
      <h2 style={{ margin: '0 0 4px' }}>Result · {test.title}</h2>
      <div style={{ color: MUTED, fontSize: 14, marginBottom: 18 }}>Time taken {fmt(seconds)}</div>
      <div style={{ ...card, textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 44, fontWeight: 800, color: ACCENT }}>{sc.marks} <span style={{ fontSize: 20, color: MUTED }}>/ {sc.max}</span></div>
        <div style={{ color: MUTED, fontSize: 14 }}>Accuracy {attempted ? Math.round((sc.right / attempted) * 100) : 0}%</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
        {[['Correct', sc.right, GREEN], ['Wrong', sc.wrong, RED], ['Skipped', sc.skipped, MUTED]].map(([l, v, c]) => (
          <div key={l} style={{ ...card, textAlign: 'center', padding: 12 }}><div style={{ fontSize: 24, fontWeight: 700, color: c }}>{v}</div><div style={{ fontSize: 13, color: MUTED }}>{l}</div></div>
        ))}
      </div>
      {Object.keys(groups).length > 1 && (
        <div style={{ ...card, marginBottom: 14 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>By topic</div>
          {Object.entries(groups).map(([g, v]) => (
            <div key={g} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14, borderTop: `1px solid ${LINE}` }}><span>{g}</span><b>{v.right}/{v.total}</b></div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <button style={primary} onClick={onRetake}>Retake test</button>
        <button style={btn} onClick={onHome}>All tests</button>
        <span style={{ flex: 1 }} />
        {[['all', 'All'], ['wrong', 'Wrong'], ['skipped', 'Skipped']].map(([id, l]) => (
          <button key={id} style={{ ...btn, ...(filter === id ? { borderColor: ACCENT, color: ACCENT } : {}) }} onClick={() => setFilter(id)}>{l}</button>
        ))}
      </div>
      {rows.length === 0 && <div style={{ color: MUTED }}>Nothing to show here.</div>}
      {rows.map(({ q, k }) => (
        <div key={k} style={{ ...card, marginBottom: 10 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>{k + 1}. {q.q}</div>
          {q.o.map((o, j) => {
            const right = j === q.a, mine = ans[k] === j
            return (
              <div key={j} style={{ padding: '7px 10px', borderRadius: 8, marginBottom: 4, fontSize: 14, background: right ? '#dcfce7' : mine ? '#fee2e2' : 'transparent', border: `1px solid ${right ? '#86efac' : mine ? '#fca5a5' : 'transparent'}` }}>
                <b>{'ABCD'[j]}.</b> {o} {right && '✓'} {mine && !right && '(your answer)'}
              </div>
            )
          })}
          {ans[k] === undefined && <div style={{ fontSize: 13, color: MUTED }}>You skipped this one.</div>}
          {q.e && <div style={{ fontSize: 13, color: MUTED, marginTop: 6 }}>💡 {q.e}</div>}
        </div>
      ))}
    </div>
  )
}

/* ---------------- test from PDF ---------------- */
function PdfTest({ onBack, onReady }) {
  const [file, setFile] = useState(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [text, setText] = useState('')
  const [qs, setQs] = useState([])
  const [name, setName] = useState('')
  const [mins, setMins] = useState(15)
  const [mark, setMark] = useState(0)
  const [count, setCount] = useState(10)

  const pick = async (f) => {
    if (!f) return
    setFile(f); setName(f.name.replace(/\.pdf$/i, '')); setBusy(true); setMsg('Reading PDF…'); setQs([])
    try {
      const t = await pdfToText(f)
      setText(t)
      const found = parseMcqs(t)
      setQs(found)
      setMins(Math.max(5, Math.round(found.length * 1.5)))
      setMsg(found.length ? `Found ${found.length} questions. Check the answers below, then start.` : t.trim().length < 50
        ? 'This PDF has no selectable text (it may be scanned photos). Reading those needs OCR, which is not added yet.'
        : 'This PDF does not look like a question paper with options. You can ask the AI to make a test from its content instead.')
    } catch (e) { console.warn(e); setMsg('Could not read this PDF.') }
    setBusy(false)
  }

  const viaAI = async () => {
    setBusy(true); setMsg('Asking the AI…')
    try {
      const prompt = `Using ONLY the text below, write ${count} multiple-choice questions to test a student. Reply with ONLY a JSON array, no other text. Each item: {"q":"question","o":["A","B","C","D"],"a":0,"e":"one-line explanation"} where "a" is the index (0-3) of the correct option.\n\nTEXT:\n${text.slice(0, 12000)}`
      const made = extractQuestions(await askAI(prompt))
      if (!made.length) setMsg('The AI reply could not be read. Try again.')
      else { setQs(made); setMsg(`The AI made ${made.length} questions.`) }
    } catch (e) { setMsg(e.message === 'AI_NOT_CONNECTED' ? AI_OFF : 'The AI could not make a test. Try again.') }
    setBusy(false)
  }

  const missing = qs.filter((q) => q.a === null).length
  const start = () => {
    const ready = qs.filter((q) => q.a !== null)
    if (!ready.length) return setMsg('Set the correct answer for at least one question.')
    onReady({ id: uid(), level: 'any', subject: 'PDF', chapter: name || 'PDF test', title: name || 'PDF test', minutes: mins, mark: MARKINGS[mark][1], qs: ready, custom: true })
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px 60px' }}>
      <button style={btn} onClick={onBack}>← Back</button>
      <h2>📄 Test from PDF</h2>
      <p style={{ color: MUTED, marginTop: 0 }}>Upload a question paper or a book PDF with multiple-choice questions and an answer key.</p>
      <label style={{ ...primary, display: 'inline-block' }}>{file ? 'Choose another PDF' : 'Choose PDF'}
        <input type="file" accept="application/pdf" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
      </label>
      {msg && <div style={{ ...card, marginTop: 14, fontSize: 14, background: SOFT }}>{msg}</div>}
      {file && !busy && qs.length === 0 && text.trim().length >= 50 && (
        <div style={{ ...card, marginTop: 14 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Make a test from this PDF with AI</div>
          <select style={field} value={count} onChange={(e) => setCount(+e.target.value)}>{[5, 10, 15, 20].map((c) => <option key={c} value={c}>{c} questions</option>)}</select>
          <button style={{ ...primary, marginTop: 10 }} onClick={viaAI}>✨ Make test with AI</button>
        </div>
      )}
      {qs.length > 0 && (
        <>
          <div style={{ ...card, marginTop: 14, display: 'grid', gap: 10 }}>
            <input style={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Test name" />
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <label style={{ flex: '1 1 140px', fontSize: 13, color: MUTED }}>Minutes<input style={field} type="number" min="1" value={mins} onChange={(e) => setMins(Math.max(1, +e.target.value || 1))} /></label>
              <label style={{ flex: '2 1 200px', fontSize: 13, color: MUTED }}>Marking<select style={field} value={mark} onChange={(e) => setMark(+e.target.value)}>{MARKINGS.map(([l], k) => <option key={l} value={k}>{l}</option>)}</select></label>
            </div>
            {missing > 0 && <div style={{ fontSize: 13, color: RED }}>{missing} question(s) have no answer key. Pick the right option for them below, or they will be left out.</div>}
          </div>
          <div style={{ maxHeight: 380, overflowY: 'auto', marginTop: 12 }}>
            {qs.map((q, k) => (
              <div key={k} style={{ ...card, marginBottom: 8, padding: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{k + 1}. {q.q}</div>
                {q.o.map((o, j) => <div key={j} style={{ fontSize: 13, color: q.a === j ? GREEN : MUTED }}>{'ABCD'[j]}. {o}</div>)}
                <select style={{ ...field, marginTop: 6, padding: 6, fontSize: 13 }} value={q.a ?? ''} onChange={(e) => setQs((all) => all.map((x, y) => (y === k ? { ...x, a: e.target.value === '' ? null : +e.target.value } : x)))}>
                  <option value="">Correct answer: not set</option>
                  {q.o.map((_, j) => <option key={j} value={j}>Correct answer: {'ABCD'[j]}</option>)}
                </select>
              </div>
            ))}
          </div>
          <button style={{ ...primary, marginTop: 14 }} onClick={start}>Start test</button>
        </>
      )}
    </div>
  )
}

/* ---------------- AI-made test ---------------- */
function AiTest({ level, subject, onBack, onReady }) {
  const [topic, setTopic] = useState('')
  const [count, setCount] = useState(10)
  const [diff, setDiff] = useState('Medium')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const lv = LEVELS.find((l) => l.id === level)

  const make = async () => {
    if (!topic.trim()) return setMsg('Type a topic or chapter first.')
    setBusy(true); setMsg('Asking the AI…')
    try {
      const prompt = `Write ${count} multiple-choice questions for a ${lv.label} student (${lv.age}). Subject: ${subject === 'All Subjects' ? 'any suitable subject' : subject}. Topic or chapter: ${topic}. Difficulty: ${diff}. Follow a typical school syllabus. Reply with ONLY a JSON array, no other text. Each item: {"q":"question","o":["A","B","C","D"],"a":0,"e":"one-line explanation"} where "a" is the index (0-3) of the correct option.`
      const made = extractQuestions(await askAI(prompt))
      if (!made.length) { setMsg('The AI reply could not be read. Try again.'); setBusy(false); return }
      onReady({ id: uid(), level, subject, chapter: topic, title: `${topic} (AI)`, minutes: Math.max(5, Math.round(made.length * 1.5)), mark: level === 'c11-12' ? [4, 1] : [1, 0], qs: made, custom: true })
    } catch (e) { setMsg(e.message === 'AI_NOT_CONNECTED' ? AI_OFF : 'The AI could not make a test. Try again.') }
    setBusy(false)
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px 60px' }}>
      <button style={btn} onClick={onBack}>← Back</button>
      <h2>✨ AI-made test</h2>
      <p style={{ color: MUTED, marginTop: 0 }}>{lv?.label} · {subject}</p>
      <div style={{ display: 'grid', gap: 12 }}>
        <input style={field} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic or chapter, e.g. Light – Reflection and Refraction" />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select style={{ ...field, flex: '1 1 140px' }} value={count} onChange={(e) => setCount(+e.target.value)}>{[5, 10, 15, 20].map((c) => <option key={c} value={c}>{c} questions</option>)}</select>
          <select style={{ ...field, flex: '1 1 140px' }} value={diff} onChange={(e) => setDiff(e.target.value)}>{['Easy', 'Medium', 'Hard'].map((d) => <option key={d}>{d}</option>)}</select>
        </div>
        <button style={primary} disabled={busy} onClick={make}>{busy ? 'Working…' : 'Make my test'}</button>
        {msg && <div style={{ ...card, fontSize: 14, background: SOFT }}>{msg}</div>}
      </div>
    </div>
  )
}

/* ---------------- page ---------------- */
export default function Tests() {
  const prefs = load(PREFS, {})
  const [level, setLevel] = useState(prefs.level || null)
  const [subject, setSubject] = useState(prefs.subject || 'All Subjects')
  const [view, setView] = useState('home')
  const [test, setTest] = useState(null)
  const [res, setRes] = useState(null)
  const [runId, setRunId] = useState(0)
  const [custom, setCustom] = useState(() => load(CUSTOM, []))
  const [history, setHistory] = useState(() => load(HIST, []))

  useEffect(() => { save(PREFS, { level, subject }) }, [level, subject])

  const open = (t) => { setTest(t); setView('intro') }
  const ready = (t) => { const next = [t, ...custom]; setCustom(next); save(CUSTOM, next); open(t) }
  const removeCustom = (id) => { const next = custom.filter((t) => t.id !== id); setCustom(next); save(CUSTOM, next) }
  const finish = ({ ans, seconds }) => {
    const sc = scoreOf(test, ans)
    const next = [{ id: uid(), title: test.title, date: Date.now(), marks: sc.marks, max: sc.max, right: sc.right, total: test.qs.length }, ...history].slice(0, 30)
    setHistory(next); save(HIST, next)
    setRes({ test, ans, seconds, sc }); setView('result')
  }

  const wrap = { minHeight: '100vh', background: '#fff', color: INK }

  if (view === 'run') return <div style={wrap}><TakeTest key={runId} test={test} onSubmit={finish} /></div>
  if (view === 'result') return <div style={wrap}><Result res={res} onRetake={() => setView('intro')} onHome={() => setView('home')} /></div>
  if (view === 'pdf') return <div style={wrap}><PdfTest onBack={() => setView('home')} onReady={ready} /></div>
  if (view === 'ai') return <div style={wrap}><AiTest level={level} subject={subject} onBack={() => setView('home')} onReady={ready} /></div>
  if (view === 'intro') {
    const [mr, mw] = test.mark
    return (
      <div style={wrap}>
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '40px 16px' }}>
          <h2 style={{ marginTop: 0 }}>{test.title}</h2>
          <div style={{ ...card, lineHeight: 1.9, fontSize: 15 }}>
            📝 {test.qs.length} questions<br />⏱ {test.minutes} minutes (the test submits itself when time is up)<br />
            ✅ +{mr} for each correct answer<br />{mw > 0 ? `❌ −${mw} for each wrong answer` : '❌ No negative marking'}<br />
            ★ You can mark questions for review and jump around using the palette.
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button style={btn} onClick={() => setView('home')}>← Back</button>
            <button style={primary} onClick={() => { setRunId((r) => r + 1); setView('run') }}>Start test</button>
          </div>
        </div>
      </div>
    )
  }

  const quizzes = BUILT_IN.filter((t) => t.level === level && (subject === 'All Subjects' || t.subject === subject))
  const chip = (on) => ({ ...btn, borderRadius: 999, padding: '7px 14px', fontSize: 13, ...(on ? { borderColor: ACCENT, color: ACCENT, background: SOFT } : {}) })

  return (
    <div style={wrap}>
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '28px 16px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40 }}>📝</div>
          <h1 style={{ margin: '4px 0', color: ACCENT }}>Test Centre</h1>
          <div style={{ color: MUTED }}>Pick your level and subject, then take a test.</div>
        </div>

        <div style={{ fontWeight: 700, marginBottom: 10 }}>Your Study Level</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 22 }}>
          {LEVELS.map((l) => (
            <button key={l.id} onClick={() => setLevel(l.id)} style={{ ...card, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', color: INK, border: `2px solid ${level === l.id ? ACCENT : LINE}`, background: level === l.id ? SOFT : '#fff' }}>
              <div style={{ fontWeight: 600 }}>{l.label}</div><div style={{ fontSize: 12, color: MUTED }}>{l.age}</div>
            </button>
          ))}
        </div>

        <div style={{ fontWeight: 700, marginBottom: 10 }}>Subject Focus</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 26 }}>
          {SUBJECTS.map((s) => <button key={s} style={chip(subject === s)} onClick={() => setSubject(s)}>{s}</button>)}
        </div>

        <div style={{ fontWeight: 700, marginBottom: 10 }}>Built-in quizzes</div>
        {!level && <div style={{ ...card, color: MUTED, marginBottom: 22 }}>Pick your study level above to see quizzes.</div>}
        {level && quizzes.length === 0 && <div style={{ ...card, color: MUTED, marginBottom: 22 }}>No built-in quiz for this level and subject yet. Make one with a PDF or the AI below.</div>}
        <div style={{ display: 'grid', gap: 10, marginBottom: 26 }}>
          {quizzes.map((t) => (
            <button key={t.id} onClick={() => open(t)} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', color: INK }}>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>{t.chapter}</div><div style={{ fontSize: 13, color: MUTED }}>{t.subject} · {t.qs.length} questions · {t.minutes} min{t.mark[1] > 0 ? ` · −${t.mark[1]} negative` : ''}</div></div>
              <span style={{ color: ACCENT, fontWeight: 600 }}>Start →</span>
            </button>
          ))}
        </div>

        <div style={{ fontWeight: 700, marginBottom: 10 }}>Make your own test</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, marginBottom: 26 }}>
          <button onClick={() => setView('pdf')} style={{ ...card, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', color: INK }}>
            <div style={{ fontSize: 26 }}>📄</div><div style={{ fontWeight: 600 }}>Test from PDF</div><div style={{ fontSize: 13, color: MUTED }}>Upload a question paper or a book PDF and take it as a test.</div>
          </button>
          <button disabled={!level} onClick={() => setView('ai')} style={{ ...card, textAlign: 'left', cursor: level ? 'pointer' : 'not-allowed', opacity: level ? 1 : 0.55, fontFamily: 'inherit', color: INK }}>
            <div style={{ fontSize: 26 }}>✨</div><div style={{ fontWeight: 600 }}>AI-made test</div><div style={{ fontSize: 13, color: MUTED }}>{level ? 'Type a topic or chapter and get a test.' : 'Pick your study level first.'}</div>
          </button>
        </div>

        {custom.length > 0 && (
          <>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>My tests</div>
            <div style={{ display: 'grid', gap: 10, marginBottom: 26 }}>
              {custom.map((t) => (
                <div key={t.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>{t.title}</div><div style={{ fontSize: 13, color: MUTED }}>{t.qs.length} questions · {t.minutes} min</div></div>
                  <button style={btn} onClick={() => removeCustom(t.id)}>Delete</button>
                  <button style={primary} onClick={() => open(t)}>Start</button>
                </div>
              ))}
            </div>
          </>
        )}

        {history.length > 0 && (
          <>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Recent attempts</div>
            <div style={card}>
              {history.slice(0, 6).map((h, k) => (
                <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 0', fontSize: 14, borderTop: k ? `1px solid ${LINE}` : 'none' }}>
                  <span>{h.title}<span style={{ color: MUTED }}> · {new Date(h.date).toLocaleDateString()}</span></span>
                  <b>{h.marks}/{h.max}</b>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
