import { useState } from 'react'

export default function Flashcards() {
  const [cards, setCards] = useState(
    JSON.parse(localStorage.getItem('sb-cards') || '[]')
  )
  const [question, setQuestion] = useState('')
  const [shortAnswer, setShortAnswer] = useState('')
  const [explanation, setExplanation] = useState('')
  const [flipped, setFlipped] = useState({})
  const [studyMode, setStudyMode] = useState(false)
  const [idx, setIdx] = useState(0)

  function save(updated) {
    setCards(updated)
    localStorage.setItem('sb-cards', JSON.stringify(updated))
  }

  function addCard() {
    if (!question.trim() || !shortAnswer.trim()) return
    save([...cards, { id: Date.now(), question, shortAnswer, explanation }])
    setQuestion('')
    setShortAnswer('')
    setExplanation('')
  }

  function deleteCard(id) {
    save(cards.filter((c) => c.id !== id))
  }

  if (studyMode && cards.length > 0) {
    const card = cards[idx]
    const isFlipped = flipped[card.id]
    return (
      <div style={{ textAlign: 'center', paddingTop: '1rem' }}>
        <h1>Study Mode</h1>
        <p style={{ color: 'var(--ink2)', marginBottom: '1.5rem' }}>
          Card {idx + 1} of {cards.length}
        </p>

        <div
          onClick={() => setFlipped({ ...flipped, [card.id]: !isFlipped })}
          style={{
            perspective: '1200px',
            maxWidth: '420px',
            height: '220px',
            margin: '0 auto',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              transition: 'transform 0.5s',
              transformStyle: 'preserve-3d',
              WebkitTransformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            {/* FRONT: question + short answer */}
            <div style={{
              position: 'absolute', inset: 0,
              backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              border: '1px solid var(--border)', borderRadius: '12px',
              background: 'var(--surface)', padding: '1.2rem',
            }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '10px' }}>
                {card.question}
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#4f46e5' }}>
                {card.shortAnswer}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--ink2)', marginTop: '12px' }}>
                tap for explanation
              </div>
            </div>

            {/* BACK: full explanation */}
            <div style={{
              position: 'absolute', inset: 0,
              backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              border: '1px solid var(--border)', borderRadius: '12px',
              background: '#eef2ff', padding: '1.2rem', overflowY: 'auto',
            }}>
              <div style={{ fontSize: '0.95rem', textAlign: 'left' }}>
                {card.explanation || '(no explanation added)'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--ink2)', marginTop: '10px' }}>
                explanation
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center',
          marginTop: '1.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-outline"
            onClick={() => setIdx(Math.max(0, idx - 1))}>← Prev</button>
          <button className="btn"
            onClick={() => setIdx(Math.min(cards.length - 1, idx + 1))}>Next →</button>
          <button className="btn btn-outline"
            onClick={() => { setStudyMode(false); setIdx(0); setFlipped({}) }}>
            Exit
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1>Flashcards</h1>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>Create a card</h2>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Question (e.g. What is the powerhouse of the cell?)"
          style={{ width: '100%', padding: '0.6rem', marginBottom: '0.5rem',
            borderRadius: '8px', border: '1px solid var(--border)', fontSize: '14px' }}
        />
        <input
          value={shortAnswer}
          onChange={(e) => setShortAnswer(e.target.value)}
          placeholder="Short answer (e.g. Mitochondria)"
          style={{ width: '100%', padding: '0.6rem', marginBottom: '0.5rem',
            borderRadius: '8px', border: '1px solid var(--border)', fontSize: '14px' }}
        />
        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="Explanation for the back (optional)"
          rows={3}
          style={{ width: '100%', padding: '0.6rem', marginBottom: '0.75rem',
            borderRadius: '8px', border: '1px solid var(--border)', fontSize: '14px',
            fontFamily: 'inherit', resize: 'vertical' }}
        />
        <button className="btn" onClick={addCard}>Add Card</button>
      </div>

      {cards.length > 0 && (
        <button className="btn" onClick={() => setStudyMode(true)}
          style={{ marginBottom: '1.5rem', width: '100%' }}>
          Study {cards.length} cards →
        </button>
      )}

      <div style={{ display: 'grid', gap: '0.75rem',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {cards.map((c) => (
          <div key={c.id} className="card">
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>{c.question}</div>
            <div style={{ color: '#4f46e5', fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>
              {c.shortAnswer}
            </div>
            <div style={{ color: 'var(--ink2)', fontSize: '13px' }}>{c.explanation}</div>
            <button onClick={() => deleteCard(c.id)}
              style={{ marginTop: '0.75rem', background: 'none', border: 'none',
                color: '#e11d48', cursor: 'pointer', fontSize: '13px' }}>
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}