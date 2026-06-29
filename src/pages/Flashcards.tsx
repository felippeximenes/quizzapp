import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, X, RotateCcw } from 'lucide-react'
import { ThemeToggle } from '../components/ThemeToggle'
import { Logo } from '../components/Logo'
import { CERTIFICATIONS } from '../data/certifications'
import { generateQuestion, listHistory } from '../services/api'
import { cn } from '@/lib/utils'
import type { ApiQuestion } from '../types/quiz'

const COUNTS = [10, 20, 30] as const
type Count = typeof COUNTS[number]

interface FlashCard extends ApiQuestion { id: number }

type FcPhase = 'setup' | 'study' | 'done'

const LETTERS = ['A', 'B', 'C', 'D']
function getCorrectIndex(answer: string) { return LETTERS.indexOf(answer.charAt(0).toUpperCase()) }
function stripLetter(o: string) { return o.replace(/^[A-D]\)\s*/i, '') }
function toTitleCase(s: string) { return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }

// Batch generate with concurrency limit
async function batchGenerate(
  domains: string[],
  count: number,
  certification: string,
): Promise<FlashCard[]> {
  const tasks: Array<{ domain: string; diff: string }> = []
  const diffs = ['easy', 'medium', 'hard']
  for (let i = 0; i < count; i++) {
    tasks.push({ domain: domains[i % domains.length], diff: diffs[i % 3] })
  }
  const CONCURRENCY = 5
  const results: FlashCard[] = []
  for (let i = 0; i < tasks.length; i += CONCURRENCY) {
    const batch = tasks.slice(i, i + CONCURRENCY)
    const settled = await Promise.allSettled(
      batch.map(({ domain, diff }) => generateQuestion(domain, diff, certification))
    )
    settled.forEach((r, j) => {
      if (r.status === 'fulfilled') results.push({ ...r.value, id: i + j })
    })
  }
  return results
}

// ─── Setup phase ───────────────────────────────────────────────────────────

function Setup({ onStart }: { onStart: (cards: FlashCard[]) => void }) {
  const [certId, setCertId] = useState<string>('auto')
  const [count, setCount] = useState<Count>(10)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  async function handleStart() {
    setGenerating(true)
    setError('')
    try {
      let domains: string[]
      let certToUse: string

      if (certId === 'auto') {
        // Load history → find weak domains
        const history = await listHistory()
        const agg: Record<string, { cert: string; correct: number; total: number }> = {}
        history.forEach(item => {
          Object.entries(item.domains).forEach(([d, s]) => {
            if (!agg[d]) agg[d] = { cert: 'clf-c02', correct: 0, total: 0 }
            agg[d].correct += s.correct
            agg[d].total += s.total
          })
        })
        const sorted = Object.entries(agg)
          .filter(([, s]) => s.total > 0)
          .sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total))

        if (sorted.length === 0) {
          // No history: use CLF-C02 fundamentals
          domains = CERTIFICATIONS[0].domains
          certToUse = 'clf-c02'
        } else {
          // Take up to 4 weakest domains, figure out cert from them
          domains = sorted.slice(0, 4).map(([d]) => d)
          // Try to match domains to a certification
          const matchedCert = CERTIFICATIONS.find(c =>
            domains.some(d => c.domains.includes(d))
          ) ?? CERTIFICATIONS[0]
          certToUse = matchedCert.id
        }
      } else {
        const cert = CERTIFICATIONS.find(c => c.id === certId)!
        domains = cert.domains
        certToUse = certId
      }

      const cards = await batchGenerate(domains, count, certToUse)
      onStart(cards)
    } catch {
      setError('Erro ao gerar flashcards. Tente novamente.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Cert selection */}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Fonte dos cartões</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCertId('auto')}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
              certId === 'auto'
                ? 'border-primary bg-primary text-white'
                : 'border-border bg-card text-foreground hover:border-primary/40',
            )}
          >
            🎯 Automático (pontos fracos)
          </button>
          {CERTIFICATIONS.map(cert => (
            <button
              key={cert.id}
              onClick={() => setCertId(cert.id)}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                certId === cert.id
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-card text-foreground hover:border-primary/40',
              )}
            >
              {cert.code}
            </button>
          ))}
        </div>
      </section>

      {/* Count selection */}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Quantidade de cartões</p>
        <div className="flex gap-3">
          {COUNTS.map(c => (
            <button
              key={c}
              onClick={() => setCount(c)}
              className={cn(
                'flex-1 rounded-xl border py-3 font-sans text-sm font-semibold transition-colors',
                count === c
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-foreground hover:border-primary/30',
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        onClick={handleStart}
        disabled={generating}
        className="w-full rounded-xl bg-primary py-3.5 font-sans text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
      >
        {generating ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            Gerando {count} cartões…
          </span>
        ) : (
          'Iniciar Flashcards'
        )}
      </button>
    </div>
  )
}

// ─── Study phase ───────────────────────────────────────────────────────────

function Study({
  cards: initialCards,
  onDone,
}: {
  cards: FlashCard[]
  onDone: (correct: number, incorrect: number) => void
}) {
  const [cards, setCards] = useState<FlashCard[]>(initialCards)
  const [flipped, setFlipped] = useState(false)
  const [score, setScore] = useState({ correct: 0, incorrect: 0 })
  const originalTotal = initialCards.length

  const current = cards[0]
  const remaining = cards.length
  const attempted = score.correct + score.incorrect
  const progress = attempted / originalTotal

  function handleResult(correct: boolean) {
    setCards(prev => {
      if (correct) return prev.slice(1)        // remove from front
      return [...prev.slice(1), prev[0]]       // move to back
    })
    setScore(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      incorrect: prev.incorrect + (correct ? 0 : 1),
    }))
    setFlipped(false)
  }

  useEffect(() => {
    if (cards.length === 0) onDone(score.correct, score.incorrect)
  }, [cards.length]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!current) return null

  const correctIdx = getCorrectIndex(current.answer)

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Cartão {Math.min(attempted + 1, originalTotal)}/{originalTotal}</span>
          <span className="flex gap-3">
            <span className="text-success font-semibold">✓ {score.correct}</span>
            <span className="text-danger font-semibold">✗ {score.incorrect}</span>
            {remaining > originalTotal && (
              <span className="text-warning font-semibold">↻ {remaining - originalTotal} para revisar</span>
            )}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      {/* Flip card */}
      <div className="flashcard-scene w-full" style={{ minHeight: '280px' }}>
        <div
          className={cn('flashcard-card w-full cursor-pointer', flipped && 'flipped')}
          style={{ minHeight: '280px' }}
          onClick={() => !flipped && setFlipped(true)}
        >
          {/* Front */}
          <div className="flashcard-face w-full rounded-2xl border border-border bg-card p-6 space-y-4" style={{ minHeight: '280px' }}>
            <div className="flex items-center justify-between">
              <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {toTitleCase(current.domain)}
              </span>
              <span className="text-xs text-muted-foreground">Clique para revelar</span>
            </div>
            <p className="font-sans text-base font-semibold leading-relaxed text-foreground">{current.question}</p>
            <div className="mt-auto pt-2 space-y-1.5">
              {current.options.map((opt, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="font-bold flex-shrink-0">{LETTERS[i]})</span>
                  <span>{stripLetter(opt)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Back */}
          <div className="flashcard-face flashcard-back w-full rounded-2xl border border-primary/30 bg-primary/5 p-6 space-y-4" style={{ minHeight: '280px' }}>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {toTitleCase(current.domain)}
              </span>
              <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-bold text-success">Resposta</span>
            </div>
            <p className="font-sans text-lg font-extrabold text-primary">
              {LETTERS[correctIdx]}) {stripLetter(current.options[correctIdx])}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{current.explanation}</p>
          </div>
        </div>
      </div>

      {/* Actions (only when flipped) */}
      {flipped ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleResult(false)}
            className="flex items-center justify-center gap-2 rounded-xl border-2 py-3.5 font-sans text-sm font-bold transition-colors"
            style={{ borderColor: '#EF4444', color: '#EF4444' }}
          >
            <X className="h-4 w-4" /> Errei
          </button>
          <button
            onClick={() => handleResult(true)}
            className="flex items-center justify-center gap-2 rounded-xl py-3.5 font-sans text-sm font-bold text-white transition-colors"
            style={{ backgroundColor: '#22C55E' }}
          >
            <Check className="h-4 w-4" /> Acertei
          </button>
        </div>
      ) : (
        <button
          onClick={() => setFlipped(true)}
          className="w-full rounded-xl border border-border bg-card py-3 text-sm font-medium text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
        >
          Revelar resposta
        </button>
      )}
    </div>
  )
}

// ─── Done phase ────────────────────────────────────────────────────────────

function Done({
  correct,
  incorrect,
  total,
  onRestart,
}: {
  correct: number
  incorrect: number
  total: number
  onRestart: () => void
}) {
  const navigate = useNavigate()
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0

  return (
    <div className="text-center space-y-6 py-8">
      <div className="text-6xl">{pct >= 70 ? '🎉' : '💪'}</div>
      <div className="space-y-1">
        <p className="font-sans text-2xl font-extrabold text-foreground">Sessão concluída!</p>
        <p className="text-sm text-muted-foreground">{total} cartões praticados</p>
      </div>
      <div className="flex justify-center gap-6">
        <div className="text-center">
          <p className="font-sans text-3xl font-extrabold text-success">{correct}</p>
          <p className="text-xs text-muted-foreground">Acertos</p>
        </div>
        <div className="text-center">
          <p className="font-sans text-3xl font-extrabold text-danger">{incorrect}</p>
          <p className="text-xs text-muted-foreground">Erros</p>
        </div>
        <div className="text-center">
          <p className="font-sans text-3xl font-extrabold text-primary">{pct}%</p>
          <p className="text-xs text-muted-foreground">Aproveitamento</p>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={onRestart}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 font-sans text-sm font-semibold text-foreground hover:border-primary/40 hover:text-primary transition-colors">
          <RotateCcw className="h-4 w-4" /> Nova sessão
        </button>
        <button onClick={() => navigate('/app')}
          className="flex-1 rounded-xl bg-primary py-3 font-sans text-sm font-bold text-white hover:bg-primary-hover transition-colors">
          Voltar ao início
        </button>
      </div>
    </div>
  )
}

// ─── Entry point ────────────────────────────────────────────────────────────

export function Flashcards() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<FcPhase>('setup')
  const [cards, setCards] = useState<FlashCard[]>([])
  const [finalScore, setFinalScore] = useState({ correct: 0, incorrect: 0 })

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <button onClick={() => navigate('/app')}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Início
          </button>
          <Logo size="sm" />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
        {phase === 'setup' && (
          <>
            <div className="mb-6 space-y-1">
              <h1 className="font-sans text-2xl font-bold text-foreground">Flash<span className="text-primary">cards</span></h1>
              <p className="text-sm text-muted-foreground">Revise com repetição espaçada</p>
            </div>
            <Setup onStart={(generatedCards) => { setCards(generatedCards); setPhase('study') }} />
          </>
        )}

        {phase === 'study' && (
          <Study
            cards={cards}
            onDone={(correct, incorrect) => {
              setFinalScore({ correct, incorrect })
              setPhase('done')
            }}
          />
        )}

        {phase === 'done' && (
          <Done
            correct={finalScore.correct}
            incorrect={finalScore.incorrect}
            total={cards.length}
            onRestart={() => { setCards([]); setPhase('setup') }}
          />
        )}
      </main>
    </div>
  )
}
