import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { History, LogOut, Zap, Star, Trophy, Crown, Flame, Target, Layers, BookOpen } from 'lucide-react'
import { ThemeToggle } from '../components/ThemeToggle'
import { Logo } from '../components/Logo'
import { useQuizStore } from '../store/quizStore'
import { useAuthStore } from '../store/authStore'
import { CERTIFICATIONS } from '../data/certifications'
import { getSubscription, listHistory } from '../services/api'
import { cn } from '@/lib/utils'
import type { SubscriptionStatus, QuizHistoryItem } from '../types/quiz'

const DIFFICULTIES = [
  { label: 'Fácil', value: 'easy', icon: Zap, color: 'text-accent', bg: 'bg-accent/10 hover:bg-accent/20', border: 'hover:border-accent/50', desc: 'Conceitos fundamentais' },
  { label: 'Médio', value: 'medium', icon: Star, color: 'text-warning', bg: 'bg-warning/10 hover:bg-warning/20', border: 'hover:border-warning/50', desc: 'Cenários práticos' },
  { label: 'Difícil', value: 'hard', icon: Trophy, color: 'text-danger', bg: 'bg-danger/10 hover:bg-danger/20', border: 'hover:border-danger/50', desc: 'Trade-offs arquiteturais' },
]

const DAILY_LIMIT = 5

function pad(n: number) { return String(n).padStart(2, '0') }
function dateStr(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

function calcStreak(items: QuizHistoryItem[]): number {
  if (!items.length) return 0
  const days = [...new Set(items.map(i => i.date.slice(0, 10)))].sort().reverse()
  const cursor = new Date()
  let streak = 0
  for (const day of days) {
    if (day === dateStr(cursor)) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    } else break
  }
  return streak
}

function toTitleCase(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function weakestDomain(items: QuizHistoryItem[]): string {
  const agg: Record<string, { correct: number; total: number }> = {}
  items.forEach(item =>
    Object.entries(item.domains).forEach(([d, stats]) => {
      if (!agg[d]) agg[d] = { correct: 0, total: 0 }
      agg[d].correct += stats.correct
      agg[d].total += stats.total
    })
  )
  const entries = Object.entries(agg).filter(([, s]) => s.total > 0)
  if (!entries.length) return '—'
  return toTitleCase(
    entries.reduce((w, c) =>
      c[1].correct / c[1].total < w[1].correct / w[1].total ? c : w
    )[0]
  )
}

export function Home() {
  const navigate = useNavigate()
  const { setCertification, setSubject } = useQuizStore()
  const { email, signOut } = useAuthStore()
  const [selectedCert, setSelectedCert] = useState('')
  const [sub, setSub] = useState<SubscriptionStatus | null>(null)
  const [history, setHistory] = useState<QuizHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  useEffect(() => {
    getSubscription().then(setSub).catch(() => null)
    listHistory()
      .then(setHistory)
      .catch(() => {})
      .finally(() => setHistoryLoading(false))
  }, [])

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  function handleSelectDifficulty(label: string) {
    setCertification(selectedCert)
    setSubject(label)
    navigate('/quiz')
  }

  const isPremium = sub?.plan === 'premium'
  const quotaExhausted = !isPremium && sub !== null && (sub.quizzesRemaining ?? 1) <= 0

  const name = email?.split('@')[0] ?? 'estudante'
  const streak = calcStreak(history)
  const avgPct = history.length ? Math.round(history.reduce((s, i) => s + i.pct, 0) / history.length) : 0
  const bestScore = history.length ? Math.max(...history.map(i => i.pct)) : 0
  const weak = weakestDomain(history)

  const metrics = [
    { label: 'Quizzes feitos', value: String(history.length) },
    { label: 'Média geral', value: `${avgPct}%` },
    { label: 'Melhor score', value: `${bestScore}%` },
    { label: 'Ponto fraco', value: weak, compact: true },
  ]

  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Logo size="sm" />
          <div className="flex items-center gap-2">
            {sub !== null && (
              <button
                onClick={() => navigate('/assinatura')}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors',
                  isPremium
                    ? 'bg-primary/15 text-primary hover:bg-primary/25'
                    : quotaExhausted
                      ? 'bg-danger/10 text-danger hover:bg-danger/20'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80',
                )}
              >
                {isPremium ? (
                  <><Crown className="h-3 w-3" /> Premium</>
                ) : (
                  <><Zap className="h-3 w-3" /> {sub.quizzesRemaining ?? 0}/{DAILY_LIMIT}</>
                )}
              </button>
            )}
            <button
              onClick={() => navigate('/historico')}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
            >
              <History className="h-3.5 w-3.5" />
              Histórico
            </button>
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-danger/40 hover:text-danger transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-6">

        {/* Welcome dashboard */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-sans text-xl font-bold text-foreground">
                Olá, {name}! 👋
              </h1>
              {streak > 0 ? (
                <div className="mt-1 flex items-center gap-1.5">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-semibold text-orange-500">
                    {streak} {streak === 1 ? 'dia' : 'dias'} em sequência
                  </span>
                </div>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">
                  Comece hoje sua sequência de estudos!
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {historyLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-border bg-background p-3 space-y-2">
                    <div className="skeleton h-7 w-12 rounded" />
                    <div className="skeleton h-3 w-16 rounded" />
                  </div>
                ))
              : metrics.map(({ label, value, compact }) => (
                  <div key={label} className="rounded-xl border border-border bg-background p-3">
                    <p className={cn(
                      'font-sans font-extrabold text-primary truncate',
                      compact ? 'text-sm leading-snug' : 'text-2xl',
                    )}>
                      {value}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
                  </div>
                ))
            }
          </div>
        </div>

        {/* Feature shortcuts */}
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Ferramentas</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Simulado', icon: Target, path: '/simulado', premium: true, desc: '65 questões' },
              { label: 'Flashcards', icon: Layers, path: '/flashcards', premium: false, desc: 'Revisão rápida' },
              { label: 'Plano de estudos', icon: BookOpen, path: '/plano-de-estudos', premium: true, desc: 'Personalizado' },
            ].map(({ label, icon: Icon, path, premium, desc }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-3.5 text-center transition-all duration-150 hover:border-primary/40 hover:shadow-sm"
              >
                <div className="relative">
                  <Icon className="h-5 w-5 text-primary" />
                  {premium && (
                    <Crown className="absolute -top-1.5 -right-2 h-3 w-3 text-warning" />
                  )}
                </div>
                <span className="font-sans text-xs font-semibold text-foreground leading-tight">{label}</span>
                <span className="text-[10px] text-muted-foreground">{desc}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Cert selection */}
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            1. Selecione a certificação
          </p>
          <div className="space-y-2">
            {CERTIFICATIONS.map((cert) => (
              <button
                key={cert.id}
                onClick={() => setSelectedCert(cert.id)}
                className={cn(
                  'w-full flex items-center gap-4 rounded-xl border bg-card px-4 py-3.5',
                  'text-left transition-all duration-200',
                  selectedCert === cert.id
                    ? 'border-primary shadow-md shadow-primary/10 bg-primary/5'
                    : 'border-border hover:border-primary/30 hover:shadow-sm',
                )}
              >
                <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: cert.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-sans text-sm font-bold whitespace-nowrap" style={{ color: cert.color }}>{cert.code}</span>
                    <span className="font-sans text-sm font-semibold text-foreground truncate">{cert.name}</span>
                  </div>
                </div>
                <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground flex-shrink-0">
                  {cert.level}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Difficulty selection or quota exhausted */}
        {selectedCert && (
          <section className="space-y-3 animate-fade-in">
            {quotaExhausted ? (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
                  <Crown className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="font-sans text-base font-bold text-foreground">Limite diário atingido</p>
                  <p className="text-sm text-muted-foreground">
                    Você usou os {DAILY_LIMIT} quizzes gratuitos de hoje.<br />
                    Volte amanhã ou assine o Premium para quizzes ilimitados.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/assinatura')}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-sans text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
                >
                  <Crown className="h-4 w-4" />
                  Ver planos
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  2. Selecione a dificuldade
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {DIFFICULTIES.map(({ label, icon: Icon, color, bg, border, desc }) => (
                    <button
                      key={label}
                      onClick={() => handleSelectDifficulty(label)}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-xl border border-border p-4',
                        'transition-all duration-200 hover:shadow-md active:scale-95',
                        bg, border,
                      )}
                    >
                      <div className={cn('rounded-lg p-2', bg)}>
                        <Icon className={cn('h-5 w-5', color)} />
                      </div>
                      <span className="font-sans text-sm font-semibold text-foreground">{label}</span>
                      <span className="text-center text-xs text-muted-foreground leading-tight">{desc}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
