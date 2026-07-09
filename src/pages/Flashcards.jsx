import { useState } from 'react'

export default function Flashcards() {
  const [cards, setCards] = useState(
    JSON.parse(localStorage.getItem('sb-cards') || '[]')
  )
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [flipped, setFlipped] = useState({})
  const [studyMode, setStudyMode] = useState(false)
  const [idx, setIdx] = useState(0)

  function save(updated) {
    setCards(updated)
    localStorage.setItem('sb-cards', JSON.stringify(updated))
  }

  function addCard() {
    if (!front.trim() || !back.trim()) return
    save([...cards, { id: Date.now(), front, back }])
    setFront('')
    setBack('')
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

        {/* Flip card container - gives 3D perspective */}
        <div
          onClick={() => setFlipped({ ...flipped, [card.id]: !isFlipped })}
          style={{
            perspective: '1000px',
            minHeight: '180px',
            cursor: 'pointer',
            maxWidth: '420px',
            margin: '0 auto',
          }}
        >
          {/* This div actually rotates */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '180px',
              transition: 'transform 0.6s',
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            {/* FRONT FACE */}
            <div
              className="card"
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backfaceVisibility: 'hidden',
                fontSize: '1.2rem',
                textAlign: 'center',
                background: 'var(--surface)',
              }}
            >
              <div>{card.front}</div>
              <div style={{ fontSize: '12px', color: 'var(--ink2)', marginTop: '8px' }}>
                (tap to reveal)
              </div>
            </div>

            {/* BACK FACE */}
            <div
              className="card"
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                fontSize: '1.1rem',
                textAlign: 'center',
                background: '#eef2ff',
                padding: '1rem',
                overflowY: 'auto',
              }}
            >
              <div>{card.back}</div>
              <div style={{ fontSize: '12px', color: 'var(--ink2)', marginTop: '8px' }}>
                (answer)
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
          value={front}
          onChange={(e) => setFront(e.target.value)}
          placeholder="Question / front"
          style={{ width: '100%', padding: '0.6rem', marginBottom: '0.5rem',
            borderRadius: '8px', border: '1px solid var(--border)', fontSize: '14px' }}
        />
        <input
          value={back}
          onChange={(e) => setBack(e.target.value)}
          placeholder="Answer / back"
          style={{ width: '100%', padding: '0.6rem', marginBottom: '0.75rem',
            borderRadius: '8px', border: '1px solid var(--border)', fontSize: '14px' }}
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
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>{c.front}</div>
            <div style={{ color: 'var(--ink2)', fontSize: '13px' }}>{c.back}</div>
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