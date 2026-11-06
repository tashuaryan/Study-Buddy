// ---- AI connection ----------------------------------------------------
// The AI parts of the Tests page (AI-made tests, and turning a notes PDF into a test)
// call askAI(). We will connect it to the same AI call as the AI Tutor once the tutor is fixed.
export async function askAI(/* prompt */) {
  throw new Error('AI_NOT_CONNECTED')
}

// Pull a JSON array of questions out of an AI reply.
export function extractQuestions(reply) {
  const a = reply.indexOf('['), b = reply.lastIndexOf(']')
  if (a < 0 || b < 0) return []
  try {
    const arr = JSON.parse(reply.slice(a, b + 1))
    return arr
      .map((x) => ({ q: x.q, o: x.o, a: typeof x.a === 'string' ? 'abcd'.indexOf(x.a.toLowerCase()) : x.a, e: x.e }))
      .filter((x) => x.q && Array.isArray(x.o) && x.o.length >= 2 && Number.isInteger(x.a) && x.a >= 0 && x.a < x.o.length)
  } catch { return [] }
}

// ---- Read multiple-choice questions out of PDF text --------------------
// Works for papers that look like:  1. Question ...  (a) ... (b) ... (c) ... (d) ...  plus an "Answer Key" section.
export function parseMcqs(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const keyAt = lines.findIndex((l) => /^(answer\s*key|answers?|solutions?)\b/i.test(l) && l.length < 40)
  const body = keyAt > 0 ? lines.slice(0, keyAt) : lines
  const keyText = keyAt > 0 ? lines.slice(keyAt).join(' ') : ''

  const qRe = /^(?:Q\.?\s*)?(\d{1,3})\s*[.)]\s+(.+)/i
  const letterOpt = /^\(?([A-Da-d])[.)]\s*(.+)/
  const digitOpt = /^\(([1-4])\)\s*(.+)/
  const qs = []
  let cur = null
  let last = -1
  for (const l of body) {
    const om = letterOpt.exec(l) || digitOpt.exec(l)
    if (om && cur) { cur.o.push(om[2]); last = cur.o.length - 1; continue }
    const qm = qRe.exec(l)
    if (qm && (!cur || cur.o.length >= 2)) { cur = { n: +qm[1], q: qm[2], o: [], a: null }; qs.push(cur); last = -1; continue }
    if (cur) { if (last >= 0) cur.o[last] += ' ' + l; else cur.q += ' ' + l }
  }

  const key = {}
  const re = /(\d{1,3})\s*[-.:)→>]+\s*\(?([A-Da-d1-4])\)?(?![A-Za-z0-9])/g
  let m
  while ((m = re.exec(keyText))) key[+m[1]] = /\d/.test(m[2]) ? +m[2] - 1 : 'abcd'.indexOf(m[2].toLowerCase())
  return qs
    .filter((x) => x.o.length >= 2)
    .map((x) => ({ q: x.q, o: x.o, a: key[x.n] !== undefined && key[x.n] < x.o.length ? key[x.n] : null }))
}
