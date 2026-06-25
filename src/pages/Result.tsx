import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ThemeToggle } from '../components/ThemeToggle'
import { SubjectBadge } from '../components/SubjectBadge'
import { useQuizStore } from '../store/quizStore'
import { generateSummary } from '../services/api'
import type { ApiSummary } from '../types/quiz'

const TOTAL = 10

export function Result() {
  const navigate = useNavigate()
  const subject = useQuizStore((s) => s.subject)
  const score = useQuizStore((s) => s.score)
  const answers = useQuizStore((s) => s.answers)
  const reset = useQuizStore((s) => s.reset)

  const [summary, setSummary] = useState<ApiSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!subject) {
      navigate('/')
      return
    }
    generateSummary(score, TOTAL, answers)
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!subject) return null

  function handlePlayAgain() {
    reset()
    navigate('/')
  }

  return (
    <>
      <header>
        <SubjectBadge subject={subject} />
        <ThemeToggle />
      </header>

      <main className="result">
        <h2 className="result-title">
          Quiz <strong>Concluído!</strong>
        </h2>

        <div>
          <section className="pontuacao">
            <SubjectBadge subject={subject} />
            <strong>{score}</strong>
            <p>de {TOTAL} questões</p>
          </section>

          {loading ? (
            <div className="summary-loading">
              <div className="spinner" />
              <p>Analisando seu desempenho com IA...</p>
            </div>
          ) : summary ? (
            <div className="summary-panel">
              <p className="summary-encouragement">{summary.encouragement}</p>

              {summary.strong_areas.length > 0 && (
                <div className="summary-section">
                  <p className="summary-section-title">✓ Pontos fortes</p>
                  <ul className="summary-list">
                    {summary.strong_areas.map((area, i) => (
                      <li key={i} className="strong">{area}</li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.weak_areas.length > 0 && (
                <div className="summary-section">
                  <p className="summary-section-title">✗ Pontos a melhorar</p>
                  <ul className="summary-list">
                    {summary.weak_areas.map((area, i) => (
                      <li key={i} className="weak">{area}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="summary-section">
                <p className="summary-section-title">Plano de estudo</p>
                <ul className="study-tips">
                  {summary.study_plan.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>

              <p className="summary-next-step">{summary.next_step}</p>
            </div>
          ) : null}

          <button className="btn-action result-btn" onClick={handlePlayAgain}>
            Jogar Novamente
          </button>
        </div>
      </main>
    </>
  )
}
