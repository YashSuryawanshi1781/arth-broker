import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { IconSparkles } from './Icons'

const SUGGEST_LEARN = [
  'What should I practice next?',
  'CNC vs MIS for beginners?',
  'How risky is my practice book?',
  'How do I reset to ₹1L?',
]

const SUGGEST_STOCK = [
  'Explain this stock simply',
  'CNC or MIS to practice here?',
  'How should I size a first order?',
]

/**
 * Educational coach panel — Learn classroom or stock context.
 * Backend: OpenAI gpt-4o-mini when OPENAI_API_KEY is set, else local fallback.
 */
export function AiCoach({ mode = 'learn', symbol, compact = false }) {
  const [status, setStatus] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    api('/ai/status')
      .then(setStatus)
      .catch(() => setStatus({ configured: false, provider: 'local' }))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, busy])

  const suggestions = mode === 'stock' ? SUGGEST_STOCK : SUGGEST_LEARN
  const title = mode === 'stock' ? `Coach · ${symbol || 'Stock'}` : 'Arth Coach'

  const send = async (text) => {
    const message = String(text || input).trim()
    if (!message || busy) return
    setInput('')
    setError('')
    const nextHistory = [...messages, { role: 'user', content: message }]
    setMessages(nextHistory)
    setBusy(true)
    try {
      const data = await api('/ai/chat', {
        method: 'POST',
        body: {
          mode,
          symbol,
          message,
          history: nextHistory.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
        },
      })
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply,
          meta: data.provider === 'openai' ? data.model : 'local coach',
        },
      ])
    } catch (err) {
      setError(err.message || 'Coach unavailable')
      setMessages((prev) => prev.slice(0, -1))
      setInput(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={`ai-coach card${compact ? ' ai-coach-compact' : ''}`}>
      <div className="ai-coach-head">
        <div className="ai-coach-title">
          <span className="icon-chip icon-chip-sm">
            <IconSparkles size={15} />
          </span>
          <div>
            <h2>{title}</h2>
            <p>
              {status?.configured
                ? 'Powered by OpenAI gpt-4o-mini · education only'
                : 'Local coach on · add OPENAI_API_KEY on API for gpt-4o-mini'}
            </p>
          </div>
        </div>
        <span className={`ai-coach-badge${status?.configured ? ' is-live' : ''}`}>
          {status?.configured ? 'OpenAI' : 'Local'}
        </span>
      </div>

      <div className="ai-coach-thread">
        {messages.length === 0 && (
          <div className="ai-coach-empty">
            <p>
              {mode === 'stock'
                ? 'Ask about this name, order types, or a safer practice size. Not investment advice.'
                : 'Ask about challenges, CNC/MIS, risk, or your paper trade book.'}
            </p>
            <div className="ai-coach-suggestions">
              {suggestions.map((s) => (
                <button key={s} type="button" className="ai-chip" onClick={() => send(s)} disabled={busy}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={`${m.role}-${i}`} className={`ai-bubble is-${m.role}`}>
            <div className="ai-bubble-text">{formatReply(m.content)}</div>
            {m.meta && <div className="ai-bubble-meta">{m.meta}</div>}
          </div>
        ))}
        {busy && <div className="ai-bubble is-assistant is-typing">Thinking…</div>}
        <div ref={bottomRef} />
      </div>

      {error && <p className="ai-coach-error">{error}</p>}

      <form
        className="ai-coach-form"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <input
          className="field"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === 'stock' ? 'Ask about this stock…' : 'Ask the coach…'}
          disabled={busy}
          maxLength={1200}
        />
        <button className="btn btn-primary" type="submit" disabled={busy || !input.trim()}>
          Ask
        </button>
      </form>
    </section>
  )
}

function formatReply(text) {
  const parts = String(text || '').split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}
