import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
  BarChart, Bar, Cell,
} from 'recharts'
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

function barFill(pct: number) {
  if (pct >= 80) return '#22C55E'
  if (pct >= 50) return '#F59E0B'
  return '#EF4444'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

interface ScoreTooltipProps { active?: boolean; payload?: Array<{ value: number }>; label?: string }
function ScoreTooltip({ active, payload, label }: ScoreTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-bold text-primary">Score: {payload[0].value}%</p>
    </div>
  )
}

interface DomainTooltipProps { active?: boolean; payload?: Array<{ payload: { domain: string; pct: number; correct: number; total: number } }> }
function DomainTooltip({ active, payload }: DomainTooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-foreground">{d.domain}</p>
      <p className="text-sm font-bold text-primary">{d.pct}%</p>
      <p className="text-xs text-muted-foreground">({d.correct}/{d.total} questões)</p>
    </div>
  )
}

export function History() {
  const navigate = useNavigate()
  const [items, setItems] = useState<QuizHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    listHistory()
      .then(setItems)
      .catch(() => setError('Não foi possível carregar o histórico.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const el = document.documentElement
    const observer = new MutationObserver(() => setIsDark(el.classList.contains('dark')))
    observer.observe(el, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const avgPct = items.length
    ? Math.round(items.reduce((s, i) => s + i.pct, 0) / items.length)
    : 0

  // Line chart: chronological order
  const lineData = [...items].reverse().map(item => ({
    date: formatShortDate(item.date),
    score: item.pct,
  }))

  // Bar chart: domain aggregation
  const domainData = (() => {
    const agg: Record<string, { correct: number; total: number }> = {}
    items.forEach(item => {
      Object.entries(item.domains).forEach(([domain, stats]) => {
        if (!agg[domain]) agg[domain] = { correct: 0, total: 0 }
        agg[domain].correct += stats.correct
        agg[domain].total += stats.total
      })
    })
    return Object.entries(agg)
      .map(([domain, stats]) => ({
        domain: domain.replace(/_/g, ' '),
        pct: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
        correct: stats.correct,
        total: stats.total,
      }))
      .sort((a, b) => b.pct - a.pct)
  })()

  // Difficulty cards
  const DIFFS = [
    { label: 'Fácil', color: '#22C55E', bg: 'bg-[#22C55E]/10', text: 'text-[#22C55E]', border: 'border-[#22C55E]/20' },
    { label: 'Médio', color: '#F59E0B', bg: 'bg-[#F59E0B]/10', text: 'text-[#F59E0B]', border: 'border-[#F59E0B]/20' },
    { label: 'Difícil', color: '#EF4444', bg: 'bg-[#EF4444]/10', text: 'text-[#EF4444]', border: 'border-[#EF4444]/20' },
  ]

  const diffStats = DIFFS.map(d => {
    const group = items.filter(i =>
      i.difficulty === d.label ||
      i.difficulty.toLowerCase() === d.label.toLowerCase()
    )
    const avg = group.length ? Math.round(group.reduce((s, i) => s + i.pct, 0) / group.length) : 0
    return { ...d, count: group.length, avg }
  })

  const chartGrid = isDark ? '#312E81' : '#C7D2FE'
  const chartTick = isDark ? '#9CA3AF' : '#6B7280'

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

            {/* ── Charts section ──────────────────────────────────── */}

            {/* Chart 1 — Score evolution */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h3 className="font-sans text-sm font-semibold text-foreground">Sua evolução</h3>
              {lineData.length < 2 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  Complete pelo menos 2 quizzes para ver sua evolução.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={lineData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B39E8" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#3B39E8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                    <XAxis dataKey="date" tick={{ fill: chartTick, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: chartTick, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                    <Tooltip content={<ScoreTooltip />} />
                    <ReferenceLine y={70} stroke="#F59E0B" strokeDasharray="4 4" label={{ value: 'Meta 70%', fill: '#F59E0B', fontSize: 10, position: 'right' }} />
                    <Area type="monotone" dataKey="score" stroke="#3B39E8" strokeWidth={2} fill="url(#scoreGrad)" dot={{ fill: '#3B39E8', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Charts 2 + 3 side by side on md+ */}
            <div className="grid gap-4 md:grid-cols-2">

              {/* Chart 2 — Domain performance */}
              {domainData.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <h3 className="font-sans text-sm font-semibold text-foreground">Desempenho por domínio</h3>
                  <ResponsiveContainer width="100%" height={Math.max(160, domainData.length * 36)}>
                    <BarChart data={domainData} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
                      <XAxis type="number" domain={[0, 100]} tick={{ fill: chartTick, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                      <YAxis type="category" dataKey="domain" width={110} tick={{ fill: chartTick, fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<DomainTooltip />} />
                      <Bar dataKey="pct" radius={[0, 4, 4, 0]} barSize={14}>
                        {domainData.map((entry) => (
                          <Cell key={entry.domain} fill={barFill(entry.pct)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Chart 3 — Difficulty distribution */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h3 className="font-sans text-sm font-semibold text-foreground">Por dificuldade</h3>
                <div className="space-y-3">
                  {diffStats.map(({ label, bg, text, border, count, avg }) => (
                    <div key={label} className={cn('rounded-lg border p-3 space-y-1', bg, border)}>
                      <div className="flex items-center justify-between">
                        <span className={cn('text-xs font-semibold', text)}>{label}</span>
                        <span className="text-xs text-muted-foreground">{count} {count === 1 ? 'quiz' : 'quizzes'}</span>
                      </div>
                      {count > 0 ? (
                        <p className={cn('font-sans text-xl font-extrabold', text)}>{avg}%</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Nenhum quiz ainda</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
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
