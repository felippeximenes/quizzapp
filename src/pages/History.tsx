import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ThemeToggle } from '../components/ThemeToggle'
import { listHistory } from '../services/api'
import type { QuizHistoryItem } from '../types/quiz'

const DOMAIN_LABELS: Record<string, string> = {
  cloud_concepts: 'Cloud Concepts',
  security: 'Security',
  technology: 'Technology',
  billing: 'Billing',
}

function pctColor(pct: number) {
  if (pct >= 80) return 'var(--green)'
  if (pct >= 50) return '#f5a623'
  return 'var(--red)'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function History() {
  const navigate = useNavigate()
  const [items, setItems] = useState<QuizHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    listHistory()
      .then(setItems)
      .catch(() => setError('Não foi possível carregar o histórico.'))
      .finally(() => setLoading(false))
  }, [])

  const avgPct = items.length
    ? Math.round(items.reduce((s, i) => s + i.pct, 0) / items.length)
    : 0

  return (
    <>
      <header style={{ justifyContent: 'space-between' }}>
        <button className="back-btn" onClick={() => navigate('/')}>← Início</button>
        <ThemeToggle />
      </header>

      <main className="history-page">
        <h2 className="history-title">Seu <strong>Histórico</strong></h2>

        {loading && <div className="loading-container"><div className="spinner" /></div>}
        {error && <p className="auth-error">{error}</p>}

        {!loading && !error && items.length === 0 && (
          <p className="history-empty">Você ainda não completou nenhum quiz.</p>
        )}

        {!loading && items.length > 0 && (
          <>
            <div className="history-stats">
              <div className="stat-card">
                <span className="stat-value">{items.length}</span>
                <span className="stat-label">Quizzes feitos</span>
              </div>
              <div className="stat-card">
                <span className="stat-value" style={{ color: pctColor(avgPct) }}>{avgPct}%</span>
                <span className="stat-label">Média geral</span>
              </div>
              <div className="stat-card">
                <span className="stat-value" style={{ color: pctColor(items[0].pct) }}>{items[0].pct}%</span>
                <span className="stat-label">Último quiz</span>
              </div>
            </div>

            <ul className="history-list">
              {items.map((item) => (
                <li key={item.quizId} className="history-item">
                  <div className="history-item-header">
                    <span className="history-date">{formatDate(item.date)}</span>
                    <span className="history-difficulty">{item.difficulty}</span>
                  </div>

                  <div className="history-score-row">
                    <span className="history-score" style={{ color: pctColor(item.pct) }}>
                      {item.score}/{item.total}
                    </span>
                    <div className="history-bar-track">
                      <div
                        className="history-bar-fill"
                        style={{ width: `${item.pct}%`, background: pctColor(item.pct) }}
                      />
                    </div>
                    <span className="history-pct" style={{ color: pctColor(item.pct) }}>
                      {item.pct}%
                    </span>
                  </div>

                  {Object.keys(item.domains).length > 0 && (
                    <div className="history-domains">
                      {Object.entries(item.domains).map(([d, v]) => (
                        <span key={d} className="domain-pill">
                          {DOMAIN_LABELS[d] ?? d}: {v.correct}/{v.total}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </>
  )
}
