import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RotateCcw, History } from 'lucide-react'
import { ThemeToggle } from '../components/ThemeToggle'
import { SubjectBadge } from '../components/SubjectBadge'
import { useQuizStore } from '../store/quizStore'
import { generateSummary, saveQuiz } from '../services/api'
import { cn } from '@/lib/utils'
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
    if (!subject) { navigate('/app'); return }
    Promise.all([
      generateSummary(score, TOTAL, answers),
      saveQuiz(score, TOTAL, subject, answers),
    ])
      .then(([s]) => setSummary(s))
      .catch(() => setSummary(null))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!subject) return null

  function handlePlayAgain() { reset(); navigate('/app') }

  const pct = Math.round((score / TOTAL) * 100)
  const scoreColor = pct >= 80 ? 'text-success' : pct >= 50 ? 'text-warning' : 'text-danger'
  const scoreBorder = pct >= 80 ? 'border-success/20 bg-success/5' : pct >= 50 ? 'border-warning/20 bg-warning/5' : 'border-danger/20 bg-danger/5'
  const pctBadge = pct >= 80 ? 'bg-success/15 text-success' : pct >= 50 ? 'bg-warning/15 text-warning' : 'bg-danger/15 text-danger'

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <SubjectBadge subject={subject} />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-8">
        <div className="text-center space-y-1">
          <h2 className="font-sans text-2xl font-bold text-foreground">
            Quiz <span className="text-primary">Concluído!</span>
          </h2>
          <p className="text-sm text-muted-foreground">Veja seu desempenho abaixo</p>
        </div>

        {/* Score card */}
        <div className={cn('rounded-2xl border p-6 text-center space-y-3', scoreBorder)}>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pontuação</p>
          <div className="flex items-end justify-center gap-1">
            <span className={cn('font-sans text-7xl font-extrabold leading-none', scoreColor)}>{score}</span>
            <span className="mb-2 font-sans text-2xl font-semibold text-muted-foreground">/{TOTAL}</span>
          </div>
          <span className={cn('inline-block rounded-full px-3 py-1 text-sm font-semibold', pctBadge)}>
            {pct}%
          </span>
        </div>

        {/* AI Summary */}
        {loading ? (
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="h-4 w-4 flex-shrink-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-sm text-muted-foreground">Analisando seu desempenho com IA…</p>
            </div>
            <div className="space-y-2 pt-1">
              <div className="skeleton h-3 w-full rounded" />
              <div className="skeleton h-3 w-5/6 rounded" />
              <div className="skeleton h-3 w-4/6 rounded" />
            </div>
          </div>
        ) : summary ? (
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 animate-fade-in">
            <p className="font-body text-sm leading-relaxed text-foreground">{summary.encouragement}</p>

            {summary.strong_areas.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-success">Pontos fortes</p>
                <ul className="space-y-1.5">
                  {summary.strong_areas.map((area, i) => (
                    <li key={i} className="flex gap-2 text-sm text-foreground">
                      <span className="flex-shrink-0 font-bold text-success">✓</span>{area}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.weak_areas.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-danger">Pontos a melhorar</p>
                <ul className="space-y-1.5">
                  {summary.weak_areas.map((area, i) => (
                    <li key={i} className="flex gap-2 text-sm text-foreground">
                      <span className="flex-shrink-0 font-bold text-danger">✗</span>{area}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.study_plan.length > 0 && (
              <div className="rounded-lg border border-primary/15 bg-primary/5 p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">Plano de estudo</p>
                <ol className="space-y-1.5">
                  {summary.study_plan.map((tip, i) => (
                    <li key={i} className="flex gap-2 text-sm text-foreground">
                      <span className="flex-shrink-0 font-semibold text-primary">{i + 1}.</span>{tip}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {summary.next_step && (
              <p className="border-t border-border pt-3 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Próximo passo: </span>
                {summary.next_step}
              </p>
            )}
          </div>
        ) : null}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handlePlayAgain}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-sans text-sm font-semibold text-white hover:bg-primary-hover transition-colors duration-150"
          >
            <RotateCcw className="h-4 w-4" />
            Jogar Novamente
          </button>
          <button
            onClick={() => navigate('/historico')}
            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 font-sans text-sm font-semibold text-foreground hover:border-primary/40 hover:text-primary transition-colors duration-150"
          >
            <History className="h-4 w-4" />
            Ver Histórico
          </button>
        </div>
      </main>
    </div>
  )
}
