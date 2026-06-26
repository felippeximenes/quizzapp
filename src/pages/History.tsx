import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { ThemeToggle } from '../components/ThemeToggle'
import { listHistory } from '../services/api'
import { cn } from '@/lib/utils'
import type { QuizHistoryItem } from '../types/quiz'

function pctColor(pct: number) {
  if (pct >= 80) return 'text-success'
  if (pct >= 50) return 'text-warning'
  return 'text-danger'
}

function pctBarColor(pct: number) {
  if (pct >= 80) return 'bg-success'
  if (pct >= 50) return 'bg-warning'
  return 'bg-danger'
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
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Início
          </button>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-8">
        <div className="space-y-1">
          <h2 className="font-sans text-2xl font-bold text-foreground">
            Seu <span className="text-primary">Histórico</span>
          </h2>
          <p className="text-sm text-muted-foreground">Acompanhe sua evolução nos quizzes</p>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <p className="text-sm text-muted-foreground">Você ainda não completou nenhum quiz.</p>
            <button
              onClick={() => navigate('/')}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
            >
              Fazer primeiro quiz
            </button>
          </div>
        )}

        {!loading && items.length > 0 && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Quizzes feitos', value: items.length, colorClass: 'text-foreground' },
                { label: 'Média geral', value: `${avgPct}%`, colorClass: pctColor(avgPct) },
                { label: 'Último quiz', value: `${items[0].pct}%`, colorClass: pctColor(items[0].pct) },
              ].map(({ label, value, colorClass }) => (
                <div key={label} className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-4 text-center">
                  <span className={cn('font-sans text-2xl font-extrabold', colorClass)}>{value}</span>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>

            {/* Quiz list */}
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.quizId} className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{formatDate(item.date)}</span>
                    <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {item.difficulty}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={cn('font-sans text-lg font-bold tabular-nums', pctColor(item.pct))}>
                      {item.score}/{item.total}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', pctBarColor(item.pct))}
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                    <span className={cn('w-10 text-right font-sans text-sm font-semibold tabular-nums', pctColor(item.pct))}>
                      {item.pct}%
                    </span>
                  </div>

                  {Object.keys(item.domains).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(item.domains).map(([d, v]) => (
                        <span
                          key={d}
                          className="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          {d.replace(/_/g, ' ')}: {v.correct}/{v.total}
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
    </div>
  )
}
