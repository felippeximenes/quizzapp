import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, AlertCircle, RefreshCw, Crown, ArrowRight } from 'lucide-react'
import { ThemeToggle } from '../components/ThemeToggle'
import { Logo } from '../components/Logo'
import { generateSummary, listHistory, getSubscription } from '../services/api'
import { cn } from '@/lib/utils'
import type { ApiSummary, QuizAnswer } from '../types/quiz'

function buildAnswers(history: Awaited<ReturnType<typeof listHistory>>): { answers: QuizAnswer[]; score: number; total: number } {
  const answers: QuizAnswer[] = history.flatMap(item =>
    Object.entries(item.domains).flatMap(([domain, stats]) => [
      ...Array<QuizAnswer>(stats.correct).fill({ domain, difficulty: item.difficulty, correct: true }),
      ...Array<QuizAnswer>(stats.total - stats.correct).fill({ domain, difficulty: item.difficulty, correct: false }),
    ])
  )
  const score = history.reduce((s, i) => s + i.score, 0)
  const total = history.reduce((s, i) => s + i.total, 0)
  return { answers, score, total }
}

export function StudyPlan() {
  const navigate = useNavigate()
  const [plan, setPlan] = useState<ApiSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPremium, setIsPremium] = useState<boolean | null>(null)
  const [hasHistory, setHasHistory] = useState(true)
  const [error, setError] = useState('')
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null)

  async function loadPlan() {
    setLoading(true)
    setError('')
    try {
      const [sub, history] = await Promise.all([getSubscription(), listHistory()])
      setIsPremium(sub.plan === 'premium')

      if (history.length === 0) {
        setHasHistory(false)
        setLoading(false)
        return
      }

      const { answers, score, total } = buildAnswers(history)
      const summary = await generateSummary(score, total, answers)
      setPlan(summary)
      setGeneratedAt(new Date())
    } catch {
      setError('Erro ao gerar plano. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPlan() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const isBlurred = isPremium === false

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <button onClick={() => navigate('/app')}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Início
          </button>
          <Logo size="sm" />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-8">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-sans text-2xl font-bold text-foreground">
              Plano de <span className="text-primary">Estudos</span>
            </h1>
            {generatedAt && (
              <p className="text-xs text-muted-foreground">
                Gerado em {generatedAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
          {!loading && plan && (
            <button
              onClick={loadPlan}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors flex-shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Regenerar
            </button>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
                <div className="skeleton h-4 w-32 rounded" />
                <div className="skeleton h-3 w-full rounded" />
                <div className="skeleton h-3 w-5/6 rounded" />
                <div className="skeleton h-3 w-4/6 rounded" />
              </div>
            ))}
            <p className="text-center text-sm text-muted-foreground animate-pulse-soft">Analisando seu histórico com IA…</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div>
        )}

        {/* No history */}
        {!loading && !error && !hasHistory && (
          <div className="rounded-xl border border-border bg-card p-8 text-center space-y-3">
            <p className="font-sans text-base font-semibold text-foreground">Sem histórico ainda</p>
            <p className="text-sm text-muted-foreground">Complete pelo menos um quiz para que a IA possa gerar seu plano personalizado.</p>
            <button onClick={() => navigate('/app')} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-sans text-sm font-semibold text-white hover:bg-primary-hover transition-colors">
              Fazer quiz agora <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Plan content */}
        {!loading && plan && (
          <div className={cn('space-y-5', isBlurred && 'relative')}>
            {/* Blur overlay for Free users */}
            {isBlurred && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-background/80 backdrop-blur-md">
                <Crown className="h-10 w-10 text-primary mb-3" />
                <p className="font-sans text-lg font-bold text-foreground">Disponível no Premium</p>
                <p className="mt-1 mb-4 text-sm text-muted-foreground text-center max-w-xs">
                  Assine o Premium para acessar seu plano de estudos personalizado com IA.
                </p>
                <button onClick={() => navigate('/assinatura')}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-sans text-sm font-semibold text-white hover:bg-primary-hover transition-colors">
                  <Crown className="h-4 w-4" /> Assinar Premium
                </button>
              </div>
            )}

            {/* Encouragement */}
            <div className="rounded-xl border-l-4 border-l-primary bg-card p-5 shadow-sm" style={{ borderLeftColor: '#3B39E8' }}>
              <p className="font-sans text-base font-semibold leading-relaxed text-foreground">{plan.encouragement}</p>
            </div>

            {/* Strong areas */}
            {plan.strong_areas.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <h2 className="font-sans text-sm font-bold uppercase tracking-widest text-success">Seus pontos fortes</h2>
                <ul className="space-y-2">
                  {plan.strong_areas.map((area, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 flex-shrink-0 mt-0.5 text-success" />
                      <span className="text-sm text-foreground leading-relaxed">{area}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Weak areas */}
            {plan.weak_areas.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <h2 className="font-sans text-sm font-bold uppercase tracking-widest text-warning">Pontos a reforçar</h2>
                <ul className="space-y-2">
                  {plan.weak_areas.map((area, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-warning" />
                      <span className="text-sm text-foreground leading-relaxed">{area}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Study plan */}
            {plan.study_plan.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <h2 className="font-sans text-sm font-bold uppercase tracking-widest text-primary">Plano semanal</h2>
                <ol className="space-y-3">
                  {plan.study_plan.map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                        {i + 1}
                      </span>
                      <span className="text-sm text-foreground leading-relaxed pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Next step */}
            {plan.next_step && (
              <div className="rounded-xl border border-primary/25 bg-primary/8 p-5 space-y-3" style={{ backgroundColor: 'rgba(59,57,232,0.05)' }}>
                <h2 className="font-sans text-sm font-bold uppercase tracking-widest text-primary">Próximo passo</h2>
                <p className="text-sm font-medium text-foreground leading-relaxed">{plan.next_step}</p>
                <button onClick={() => navigate('/app')}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-sans text-sm font-semibold text-white hover:bg-primary-hover transition-colors">
                  Começar a praticar <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
