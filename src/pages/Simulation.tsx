import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Crown, Timer, CheckCircle, XCircle, RotateCcw } from 'lucide-react'
import { ThemeToggle } from '../components/ThemeToggle'
import { Logo } from '../components/Logo'
import { ProgressBar } from '../components/ProgressBar'
import { CERTIFICATIONS, getCertification } from '../data/certifications'
import { generateQuestion, evaluateAnswer, saveQuiz, getSubscription } from '../services/api'
import { useSimulationStore, SIM_TOTAL, diffForIndex } from '../store/simulationStore'
import { cn } from '@/lib/utils'
import type { ApiFeedback, QuizAnswer } from '../types/quiz'

const LETTERS = ['A', 'B', 'C', 'D']
function getCorrectIndex(answer: string) { return LETTERS.indexOf(answer.charAt(0).toUpperCase()) }
function stripLetter(o: string) { return o.replace(/^[A-D]\)\s*/i, '') }

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

// ─── Config phase ──────────────────────────────────────────────────────────

function SimConfig() {
  const navigate = useNavigate()
  const startSim = useSimulationStore((s) => s.startSim)
  const [selectedCert, setSelectedCert] = useState('')
  const [isPremium, setIsPremium] = useState<boolean | null>(null)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    getSubscription().then(sub => setIsPremium(sub.plan === 'premium')).catch(() => setIsPremium(false))
  }, [])

  function handleStart() {
    if (!selectedCert) return
    setStarting(true)
    startSim(selectedCert)
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <button onClick={() => navigate('/app')} className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Início
          </button>
          <Logo size="sm" />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 space-y-6 px-4 py-8">
        <div className="space-y-1">
          <h1 className="font-sans text-2xl font-bold text-foreground">Modo <span className="text-primary">Simulado</span></h1>
          <p className="text-sm text-muted-foreground">Simule a prova real da AWS</p>
        </div>

        {/* Info banner */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex flex-wrap gap-4 text-sm font-medium text-foreground">
          <span>📋 65 questões</span>
          <span>⏱ 130 minutos</span>
          <span>🚫 Sem feedback durante a prova</span>
        </div>

        {/* Cert selection */}
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Selecione a certificação</p>
          <div className="space-y-2">
            {CERTIFICATIONS.map((cert) => (
              <button key={cert.id} onClick={() => setSelectedCert(cert.id)}
                className={cn(
                  'w-full flex items-center gap-4 rounded-xl border bg-card px-4 py-3.5 text-left transition-all duration-150',
                  selectedCert === cert.id
                    ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                    : 'border-border hover:border-primary/30',
                )}>
                <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: cert.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-sans text-sm font-bold" style={{ color: cert.color }}>{cert.code}</span>
                    <span className="font-sans text-sm font-semibold text-foreground truncate">{cert.name}</span>
                  </div>
                </div>
                <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground flex-shrink-0">{cert.level}</span>
              </button>
            ))}
          </div>
        </section>

        {/* CTA / Paywall */}
        {isPremium === null ? (
          <div className="h-12 rounded-xl bg-muted animate-pulse" />
        ) : isPremium ? (
          <button
            onClick={handleStart}
            disabled={!selectedCert || starting}
            className="w-full rounded-xl bg-primary py-3.5 font-sans text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-40 transition-colors"
          >
            {starting ? 'Iniciando…' : 'Iniciar Simulado'}
          </button>
        ) : (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center space-y-4">
            <Crown className="mx-auto h-10 w-10 text-primary" />
            <div className="space-y-1">
              <p className="font-sans text-base font-bold text-foreground">Funcionalidade Premium</p>
              <p className="text-sm text-muted-foreground">O Modo Simulado está disponível apenas para assinantes Premium.</p>
            </div>
            <button onClick={() => navigate('/assinatura')}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-sans text-sm font-semibold text-white hover:bg-primary-hover transition-colors">
              <Crown className="h-4 w-4" /> Ver planos
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

// ─── Running phase ──────────────────────────────────────────────────────────

function SimRunning() {
  const {
    certification, questions, selectedAnswers, currentIndex,
    timeRemaining, setQuestion, setAnswer, goTo, tick, finish,
  } = useSimulationStore()

  const cert = getCertification(certification)
  const fetchingRef = useRef<Set<number>>(new Set())
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [loadingQ, setLoadingQ] = useState(false)

  // Timer
  useEffect(() => {
    const id = setInterval(() => { if (tick()) clearInterval(id) }, 1000)
    return () => clearInterval(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load question on demand + pre-fetch next
  function loadQ(index: number) {
    if (index < 0 || index >= SIM_TOTAL) return
    if (questions[index] !== null) return
    if (fetchingRef.current.has(index)) return
    fetchingRef.current.add(index)
    const domain = cert.domains[index % cert.domains.length]
    generateQuestion(domain, diffForIndex(index), certification)
      .then(q => { setQuestion(index, q); fetchingRef.current.delete(index) })
      .catch(() => fetchingRef.current.delete(index))
  }

  useEffect(() => {
    setLoadingQ(questions[currentIndex] === null)
    loadQ(currentIndex)
    loadQ(currentIndex + 1) // pre-fetch
  }, [currentIndex, questions[currentIndex]]) // eslint-disable-line react-hooks/exhaustive-deps

  const question = questions[currentIndex]
  const answered = selectedAnswers.filter(a => a !== null).length
  const isLast = currentIndex === SIM_TOTAL - 1
  const isWarning = timeRemaining < 600

  function handleSelect(i: number) { setAnswer(currentIndex, i) }
  function handlePrev() { if (currentIndex > 0) goTo(currentIndex - 1) }
  function handleNext() { if (currentIndex < SIM_TOTAL - 1) goTo(currentIndex + 1) }
  function handleFinalize() {
    if (isLast || confirmFinish) { finish(); return }
    setConfirmFinish(true)
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-border px-2.5 py-1 text-xs font-bold" style={{ color: cert.color }}>{cert.code}</span>
            <span className="text-xs text-muted-foreground">{answered}/{SIM_TOTAL} respondidas</span>
          </div>
          <div className={cn('flex items-center gap-1.5 font-mono text-base font-bold tabular-nums', isWarning ? 'text-danger' : 'text-foreground')}>
            <Timer className="h-4 w-4" />
            {formatTime(timeRemaining)}
          </div>
          <ThemeToggle />
        </div>
        <div className="px-4 pb-2">
          <ProgressBar current={answered} total={SIM_TOTAL} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 gap-6 px-4 py-6 lg:grid lg:grid-cols-[1fr_200px]">
        {/* Question area */}
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Questão {currentIndex + 1} de {SIM_TOTAL}
          </p>

          <div className="rounded-xl border border-border bg-card p-5 min-h-[120px]">
            {loadingQ || !question ? (
              <div className="space-y-3">
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-4 w-full rounded" />
                <div className="skeleton h-4 w-5/6 rounded" />
                <p className="mt-3 text-xs text-muted-foreground animate-pulse-soft">Gerando questão…</p>
              </div>
            ) : (
              <p className="font-sans text-base font-medium leading-relaxed text-foreground">{question.question}</p>
            )}
          </div>

          {question && (
            <div className="space-y-2.5">
              {question.options.map((opt, i) => {
                const isSelected = selectedAnswers[currentIndex] === i
                return (
                  <button key={i} onClick={() => handleSelect(i)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm transition-all duration-150',
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card hover:border-primary/40 hover:bg-primary/5',
                    )}>
                    <span className={cn(
                      'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                      isSelected ? 'border-primary bg-primary text-white' : 'border-border text-muted-foreground',
                    )}>{LETTERS[i]}</span>
                    <span className="text-foreground">{stripLetter(opt)}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Nav buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button onClick={handlePrev} disabled={currentIndex === 0}
              className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:border-primary/40 hover:text-primary disabled:opacity-40 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Anterior
            </button>
            {!isLast && (
              <button onClick={handleNext}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-hover transition-colors">
                Próxima <ArrowRight className="h-4 w-4" />
              </button>
            )}
            <button onClick={handleFinalize}
              className={cn(
                'rounded-xl px-4 py-2.5 text-sm font-bold transition-colors',
                isLast
                  ? 'flex flex-1 items-center justify-center bg-accent text-white hover:bg-accent-hover'
                  : 'border border-border text-muted-foreground hover:border-danger/40 hover:text-danger',
              )}>
              Finalizar
            </button>
          </div>
        </div>

        {/* Question map */}
        <div className="mt-6 lg:mt-0">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mapa</p>
          <div className="grid grid-cols-10 gap-1 lg:grid-cols-5">
            {Array.from({ length: SIM_TOTAL }, (_, i) => (
              <button key={i} onClick={() => goTo(i)}
                title={`Questão ${i + 1}`}
                className={cn(
                  'flex h-7 w-full items-center justify-center rounded text-xs font-bold transition-all duration-100',
                  currentIndex === i && 'ring-2 ring-primary ring-offset-1',
                  selectedAnswers[i] !== null
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground hover:bg-primary/20',
                )}>
                {i + 1}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary mr-1 align-middle" /> Respondida
          </p>
        </div>
      </main>

      {/* Confirm finish modal */}
      {confirmFinish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl space-y-4">
            <h3 className="font-sans text-lg font-bold text-foreground">Finalizar simulado?</h3>
            <p className="text-sm text-muted-foreground">
              Você ainda tem questões sem resposta. Deseja finalizar assim mesmo?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmFinish(false)}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-foreground hover:border-primary/40 transition-colors">
                Continuar
              </button>
              <button onClick={() => { setConfirmFinish(false); finish() }}
                className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-white hover:bg-primary-hover transition-colors">
                Finalizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Results phase ──────────────────────────────────────────────────────────

function SimResults() {
  const navigate = useNavigate()
  const { certification, questions, selectedAnswers, reset } = useSimulationStore()
  const cert = getCertification(certification)

  const [evals, setEvals] = useState<Record<number, ApiFeedback>>({})
  const [evalProgress, setEvalProgress] = useState(0)
  const [evalTotal, setEvalTotal] = useState(0)
  const [saved, setSaved] = useState(false)

  // Calculate score
  const results = questions.map((q, i) => {
    if (!q || selectedAnswers[i] === null) return null
    const correctIdx = getCorrectIndex(q.answer)
    const userIdx = selectedAnswers[i]!
    return { q, i, correctIdx, userIdx, correct: userIdx === correctIdx }
  }).filter(Boolean) as Array<{ q: NonNullable<typeof questions[0]>; i: number; correctIdx: number; userIdx: number; correct: boolean }>

  const score = results.filter(r => r.correct).length
  const pct = Math.round((score / SIM_TOTAL) * 100)
  const passed = pct >= 70

  // Domain breakdown
  const domainMap: Record<string, { correct: number; total: number }> = {}
  results.forEach(({ q, correct }) => {
    if (!domainMap[q.domain]) domainMap[q.domain] = { correct: 0, total: 0 }
    domainMap[q.domain].total++
    if (correct) domainMap[q.domain].correct++
  })

  // Save quiz on mount
  useEffect(() => {
    if (saved) return
    setSaved(true)
    const answers: QuizAnswer[] = results.map(r => ({
      domain: r.q.domain,
      difficulty: r.q.difficulty,
      correct: r.correct,
    }))
    saveQuiz(score, SIM_TOTAL, 'Simulado', answers).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Batch evaluate wrong answers
  useEffect(() => {
    const wrong = results.filter(r => !r.correct)
    setEvalTotal(wrong.length)
    if (!wrong.length) return

    const BATCH = 5
    let done = 0

    async function run() {
      for (let b = 0; b < wrong.length; b += BATCH) {
        const batch = wrong.slice(b, b + BATCH)
        const settled = await Promise.allSettled(
          batch.map(({ q, userIdx }) =>
            evaluateAnswer({
              question: q.question,
              options: q.options,
              correct_answer: q.answer,
              selected_answer: LETTERS[userIdx],
              domain: q.domain,
              explanation: q.explanation,
              certification,
            })
          )
        )
        setEvals(prev => {
          const next = { ...prev }
          settled.forEach((r, j) => {
            if (r.status === 'fulfilled') next[batch[j].i] = r.value
          })
          return next
        })
        done += batch.length
        setEvalProgress(done)
      }
    }
    run()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function toTitleCase(s: string) { return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Logo size="sm" />
          <span className="rounded-full border border-border px-2.5 py-1 text-xs font-bold" style={{ color: cert.color }}>{cert.code}</span>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-8">
        {/* Score card */}
        <div className={cn(
          'rounded-2xl border p-6 text-center space-y-3',
          passed ? 'border-success/20 bg-success/5' : 'border-danger/20 bg-danger/5',
        )}>
          <div className={cn(
            'inline-block rounded-full px-4 py-1.5 font-sans text-sm font-extrabold tracking-widest',
            passed ? 'bg-success text-white' : 'bg-danger text-white',
          )}>
            {passed ? '✓ APROVADO' : '✗ REPROVADO'}
          </div>
          <div className="flex items-end justify-center gap-1">
            <span className={cn('font-sans text-6xl font-extrabold leading-none', passed ? 'text-success' : 'text-danger')}>
              {score}
            </span>
            <span className="mb-1 font-sans text-2xl font-semibold text-muted-foreground">/{SIM_TOTAL}</span>
          </div>
          <p className={cn('font-sans text-2xl font-bold', passed ? 'text-success' : 'text-danger')}>{pct}%</p>
          <p className="text-xs text-muted-foreground">Mínimo para aprovação: 70%</p>
        </div>

        {/* Domain breakdown */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="font-sans text-sm font-semibold text-foreground">Desempenho por domínio</h3>
          <div className="space-y-3">
            {Object.entries(domainMap).map(([domain, stats]) => {
              const dpct = Math.round((stats.correct / stats.total) * 100)
              return (
                <div key={domain} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{toTitleCase(domain)}</span>
                    <span className={cn('font-bold', dpct >= 70 ? 'text-success' : 'text-danger')}>{dpct}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500', dpct >= 70 ? 'bg-success' : 'bg-danger')}
                      style={{ width: `${dpct}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{stats.correct}/{stats.total} questões</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Eval progress */}
        {evalTotal > 0 && evalProgress < evalTotal && (
          <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3">
            <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin flex-shrink-0" />
            <p className="text-sm text-muted-foreground">Analisando questões erradas com IA… {evalProgress}/{evalTotal}</p>
          </div>
        )}

        {/* Question review */}
        <div className="space-y-3">
          <h3 className="font-sans text-sm font-semibold text-foreground">Revisão completa ({results.length} questões respondidas)</h3>
          {results.map(({ q, i, correctIdx, userIdx, correct }) => (
            <div key={i} className={cn(
              'rounded-xl border p-4 space-y-3',
              correct ? 'border-success/20 bg-success/5' : 'border-danger/20 bg-danger/5',
            )}>
              <div className="flex items-start gap-2">
                {correct
                  ? <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-success" />
                  : <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-danger" />}
                <p className="text-sm font-medium text-foreground leading-relaxed">{q.question}</p>
              </div>
              <div className="space-y-1 text-xs">
                <p>
                  <span className="text-muted-foreground">Sua resposta: </span>
                  <span className={cn('font-semibold', correct ? 'text-success' : 'text-danger')}>
                    {LETTERS[userIdx]}) {stripLetter(q.options[userIdx])}
                  </span>
                </p>
                {!correct && (
                  <p>
                    <span className="text-muted-foreground">Resposta correta: </span>
                    <span className="font-semibold text-success">
                      {LETTERS[correctIdx]}) {stripLetter(q.options[correctIdx])}
                    </span>
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-2">
                {evals[i]?.feedback ?? q.explanation}
              </p>
              {evals[i]?.study_tips && evals[i].study_tips.length > 0 && (
                <ul className="space-y-0.5">
                  {evals[i].study_tips.map((tip, ti) => (
                    <li key={ti} className="text-xs text-muted-foreground flex gap-2">
                      <span className="text-primary mt-0.5">›</span>{tip}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 pb-8">
          <button onClick={() => { reset() }}
            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 font-sans text-sm font-semibold text-foreground hover:border-primary/40 hover:text-primary transition-colors">
            <RotateCcw className="h-4 w-4" /> Tentar novamente
          </button>
          <button onClick={() => navigate('/app')}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-sans text-sm font-bold text-white hover:bg-primary-hover transition-colors">
            Voltar ao início
          </button>
        </div>
      </main>
    </div>
  )
}

// ─── Entry point ────────────────────────────────────────────────────────────

export function Simulation() {
  const phase = useSimulationStore((s) => s.phase)
  if (phase === 'running') return <SimRunning />
  if (phase === 'results') return <SimResults />
  return <SimConfig />
}
