import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, RotateCcw } from 'lucide-react'
import { ThemeToggle } from '../components/ThemeToggle'
import { ProgressBar } from '../components/ProgressBar'
import { useQuizStore } from '../store/quizStore'
import { generateQuestion, evaluateAnswer } from '../services/api'
import { getCertification } from '../data/certifications'
import { cn } from '@/lib/utils'
import type { ApiQuestion, ApiFeedback } from '../types/quiz'

const TOTAL = 10
const LETTERS = ['A', 'B', 'C', 'D']
const DIFFICULTY_MAP: Record<string, string> = { 'Fácil': 'easy', 'Médio': 'medium', 'Difícil': 'hard' }
type Phase = 'loading' | 'selecting' | 'evaluating' | 'feedback'

function getCorrectIndex(answer: string) { return LETTERS.indexOf(answer.charAt(0).toUpperCase()) }
function stripLetter(option: string) { return option.replace(/^[A-D]\)\s*/i, '') }

export function Quiz() {
  const navigate = useNavigate()
  const subject = useQuizStore((s) => s.subject)
  const certification = useQuizStore((s) => s.certification)
  const storeSetScore = useQuizStore((s) => s.setScore)
  const addAnswer = useQuizStore((s) => s.addAnswer)

  const [currentQ, setCurrentQ] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [phase, setPhase] = useState<Phase>('loading')
  const [localScore, setLocalScore] = useState(0)
  const [question, setQuestion] = useState<ApiQuestion | null>(null)
  const [feedback, setFeedback] = useState<ApiFeedback | null>(null)
  const [error, setError] = useState<string | null>(null)

  const cert = getCertification(certification)
  const difficulty = DIFFICULTY_MAP[subject] ?? 'easy'
  const isLastQuestion = currentQ === TOTAL - 1

  const fetchQuestion = useCallback(async (index: number) => {
    setPhase('loading'); setQuestion(null); setSelected(null); setFeedback(null); setError(null)
    try {
      const domain = cert.domains[index % cert.domains.length]
      const q = await generateQuestion(domain, difficulty, certification)
      setQuestion(q); setPhase('selecting')
    } catch { setError('Erro ao gerar pergunta. Tente novamente.') }
  }, [difficulty, certification, cert.domains])

  useEffect(() => {
    if (!subject || !certification) { navigate('/app'); return }
    fetchQuestion(0)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAnswer() {
    if (selected === null || !question) return
    setPhase('evaluating')
    const correctIndex = getCorrectIndex(question.answer)
    const isCorrect = selected === correctIndex
    if (isCorrect) setLocalScore((s) => s + 1)
    addAnswer({ domain: question.domain, difficulty: question.difficulty, correct: isCorrect })
    try {
      const fb = await evaluateAnswer({ question: question.question, options: question.options, correct_answer: question.answer, selected_answer: LETTERS[selected], domain: question.domain, explanation: question.explanation, certification })
      setFeedback(fb)
    } catch {
      setFeedback({ correct: selected === correctIndex, feedback: question.explanation, study_tips: [], aws_docs_topic: question.domain })
    }
    setPhase('feedback')
  }

  function handleNext() {
    if (isLastQuestion) { storeSetScore(localScore); navigate('/resultado') }
    else { const next = currentQ + 1; setCurrentQ(next); fetchQuestion(next) }
  }

  const correctIndex = question ? getCorrectIndex(question.answer) : -1
  const isAnswered = phase === 'feedback'

  function optionState(i: number) {
    if (phase !== 'feedback') return selected === i ? 'selected' : 'idle'
    if (i === correctIndex) return 'correct'
    if (i === selected) return 'wrong'
    return 'idle'
  }

  const optionClass = {
    idle: 'border-border bg-card hover:border-primary/40 hover:bg-primary/5',
    selected: 'border-primary bg-primary/10',
    correct: 'border-success bg-success/10 text-success',
    wrong: 'border-danger bg-danger/10 text-danger',
  }

  if (error) return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-4">
      <p className="text-sm text-muted-foreground">{error}</p>
      <button onClick={() => fetchQuestion(currentQ)} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white">
        <RotateCcw className="h-4 w-4" /> Tentar novamente
      </button>
    </div>
  )

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-border px-2.5 py-1 text-xs font-semibold" style={{ color: cert.color }}>{cert.code}</span>
            <span className="text-xs text-muted-foreground">{subject}</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-6">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Questão {currentQ + 1} de {TOTAL}</span>
            <span>{Math.round(((currentQ + 1) / TOTAL) * 100)}%</span>
          </div>
          <ProgressBar current={currentQ + 1} total={TOTAL} />
        </div>

        {/* Question */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm min-h-[120px]">
          {phase === 'loading' ? (
            <div className="space-y-3">
              <div className="skeleton h-4 w-3/4 rounded" />
              <div className="skeleton h-4 w-full rounded" />
              <div className="skeleton h-4 w-5/6 rounded" />
              <p className="mt-4 text-xs text-muted-foreground animate-pulse-soft">Gerando questão com IA...</p>
            </div>
          ) : (
            <p className="font-sans text-base font-medium leading-relaxed text-foreground">{question?.question}</p>
          )}
        </div>

        {/* Options */}
        {phase !== 'loading' && (
          <div className="space-y-2.5">
            {question?.options.map((option, i) => {
              const state = optionState(i)
              return (
                <button key={i} onClick={() => { if (phase === 'selecting') setSelected(i) }}
                  disabled={phase === 'evaluating' || phase === 'feedback'}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm',
                    'transition-all duration-150 disabled:cursor-default',
                    optionClass[state],
                  )}
                >
                  <span className={cn(
                    'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                    state === 'idle' && 'border-border text-muted-foreground',
                    state === 'selected' && 'border-primary bg-primary text-white',
                    state === 'correct' && 'border-success bg-success text-white',
                    state === 'wrong' && 'border-danger bg-danger text-white',
                  )}>{LETTERS[i]}</span>
                  <span className="font-body text-foreground">{stripLetter(option)}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Feedback */}
        {isAnswered && feedback && (
          <div className={cn(
            'rounded-xl border-l-4 p-4 space-y-2 animate-fade-in',
            feedback.correct ? 'border-l-success bg-success/5' : 'border-l-danger bg-danger/5',
          )}>
            <p className={cn('font-sans text-sm font-bold', feedback.correct ? 'text-success' : 'text-danger')}>
              {feedback.correct ? '✓ Correto!' : '✗ Incorreto'}
            </p>
            <p className="font-body text-sm text-foreground leading-relaxed">{feedback.feedback}</p>
            {feedback.study_tips.length > 0 && (
              <ul className="mt-2 space-y-1">
                {feedback.study_tips.map((tip, i) => (
                  <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                    <span className="text-accent mt-0.5">›</span>{tip}
                  </li>
                ))}
              </ul>
            )}
            {feedback.aws_docs_topic && (
              <p className="text-xs text-muted-foreground">Tópico: <span className="font-medium text-foreground">{feedback.aws_docs_topic}</span></p>
            )}
          </div>
        )}

        {/* Action button */}
        {phase !== 'loading' && (
          <button
            onClick={isAnswered ? handleNext : handleAnswer}
            disabled={(phase === 'selecting' && selected === null) || phase === 'evaluating'}
            className={cn(
              'w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-sans text-sm font-semibold',
              'transition-all duration-150 disabled:opacity-40',
              isAnswered
                ? 'bg-primary text-white hover:bg-primary-hover'
                : 'bg-primary text-white hover:bg-primary-hover',
            )}
          >
            {phase === 'evaluating' ? (
              <><div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Analisando...</>
            ) : isAnswered ? (
              <>{isLastQuestion ? 'Ver resultado' : 'Próxima questão'} <ChevronRight className="h-4 w-4" /></>
            ) : 'Confirmar resposta'}
          </button>
        )}
      </main>
    </div>
  )
}
