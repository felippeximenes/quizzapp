import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ThemeToggle } from '../components/ThemeToggle'
import { SubjectBadge } from '../components/SubjectBadge'
import { ProgressBar } from '../components/ProgressBar'
import { useQuizStore } from '../store/quizStore'
import { generateQuestion, evaluateAnswer } from '../services/api'
import type { ApiQuestion, ApiFeedback } from '../types/quiz'

const TOTAL = 10
const DOMAINS = ['cloud_concepts', 'security', 'technology', 'billing']
const LETTERS = ['A', 'B', 'C', 'D']

const DIFFICULTY_MAP: Record<string, string> = {
  'Fácil': 'easy',
  'Médio': 'medium',
  'Difícil': 'hard',
}

type Phase = 'loading' | 'selecting' | 'evaluating' | 'feedback'

function getCorrectIndex(answer: string): number {
  return LETTERS.indexOf(answer.charAt(0).toUpperCase())
}

function stripLetter(option: string): string {
  return option.replace(/^[A-D]\)\s*/i, '')
}

function getOptionClass(
  index: number,
  selected: number | null,
  correctIndex: number,
  phase: Phase,
): string {
  if (phase === 'loading' || phase === 'selecting' || phase === 'evaluating') {
    return selected === index ? 'selected' : ''
  }
  if (index === correctIndex) return 'correta'
  if (index === selected) return 'errada'
  return ''
}

export function Quiz() {
  const navigate = useNavigate()
  const subject = useQuizStore((s) => s.subject)
  const storeSetScore = useQuizStore((s) => s.setScore)

  const [currentQ, setCurrentQ] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [phase, setPhase] = useState<Phase>('loading')
  const [localScore, setLocalScore] = useState(0)
  const [question, setQuestion] = useState<ApiQuestion | null>(null)
  const [feedback, setFeedback] = useState<ApiFeedback | null>(null)
  const [error, setError] = useState<string | null>(null)

  const difficulty = DIFFICULTY_MAP[subject] ?? 'easy'
  const isLastQuestion = currentQ === TOTAL - 1

  const fetchQuestion = useCallback(
    async (index: number) => {
      setPhase('loading')
      setQuestion(null)
      setSelected(null)
      setFeedback(null)
      setError(null)
      try {
        const domain = DOMAINS[index % DOMAINS.length]
        const q = await generateQuestion(domain, difficulty)
        setQuestion(q)
        setPhase('selecting')
      } catch {
        setError('Erro ao gerar pergunta. Tente novamente.')
      }
    },
    [difficulty],
  )

  useEffect(() => {
    if (!subject) {
      navigate('/')
      return
    }
    fetchQuestion(0)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAnswer() {
    if (selected === null || !question) return
    setPhase('evaluating')

    const correctIndex = getCorrectIndex(question.answer)
    if (selected === correctIndex) setLocalScore((s) => s + 1)

    try {
      const fb = await evaluateAnswer({
        question: question.question,
        options: question.options,
        correct_answer: question.answer,
        selected_answer: LETTERS[selected],
        domain: question.domain,
        explanation: question.explanation,
      })
      setFeedback(fb)
    } catch {
      setFeedback({
        correct: selected === correctIndex,
        feedback: question.explanation,
        study_tips: [],
        aws_docs_topic: question.domain,
      })
    }
    setPhase('feedback')
  }

  function handleNext() {
    if (isLastQuestion) {
      storeSetScore(localScore)
      navigate('/resultado')
    } else {
      const next = currentQ + 1
      setCurrentQ(next)
      fetchQuestion(next)
    }
  }

  if (error) {
    return (
      <>
        <header>
          <SubjectBadge subject={subject} />
          <ThemeToggle />
        </header>
        <main className="quiz">
          <section className="pergunta">
            <p className="error-msg">{error}</p>
          </section>
          <section className="alternativas">
            <button className="btn-action" onClick={() => fetchQuestion(currentQ)}>
              Tentar novamente
            </button>
          </section>
        </main>
      </>
    )
  }

  const correctIndex = question ? getCorrectIndex(question.answer) : -1
  const isAnswered = phase === 'feedback'
  const isLoading = phase === 'loading'

  return (
    <>
      <header>
        <SubjectBadge subject={subject} />
        <ThemeToggle />
      </header>

      <main className="quiz">
        <section className="pergunta">
          <div>
            <p>Questão {currentQ + 1} de {TOTAL}</p>
            {isLoading ? (
              <p className="loading-text">Gerando pergunta com IA...</p>
            ) : (
              <h2>{question?.question}</h2>
            )}
          </div>
          <ProgressBar current={currentQ + 1} total={TOTAL} />
        </section>

        <section className="alternativas">
          {isLoading ? (
            <div className="loading-container">
              <div className="spinner" />
            </div>
          ) : (
            <>
              <form onSubmit={(e) => e.preventDefault()}>
                {question?.options.map((option, index) => (
                  <label
                    key={index}
                    className={getOptionClass(index, selected, correctIndex, phase)}
                    onClick={() => {
                      if (phase === 'selecting') setSelected(index)
                    }}
                  >
                    <input
                      type="radio"
                      name="alternativa"
                      value={option}
                      readOnly
                      checked={selected === index}
                    />
                    <span className="option-letter">{LETTERS[index]}</span>
                    {stripLetter(option)}
                  </label>
                ))}
              </form>

              {isAnswered && feedback && (
                <div className={`feedback-panel ${feedback.correct ? 'correct' : 'incorrect'}`}>
                  <p className="feedback-result">
                    {feedback.correct ? '✓ Correto!' : '✗ Incorreto'}
                  </p>
                  <p className="feedback-text">{feedback.feedback}</p>
                  {feedback.study_tips.length > 0 && (
                    <>
                      <p className="study-tips-title">Dicas de estudo:</p>
                      <ul className="study-tips">
                        {feedback.study_tips.map((tip, i) => (
                          <li key={i}>{tip}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  {feedback.aws_docs_topic && (
                    <p className="aws-topic">Tópico AWS: <strong>{feedback.aws_docs_topic}</strong></p>
                  )}
                </div>
              )}

              <button
                className="btn-action"
                onClick={isAnswered ? handleNext : handleAnswer}
                disabled={(phase === 'selecting' && selected === null) || phase === 'evaluating'}
              >
                {phase === 'evaluating'
                  ? 'Analisando...'
                  : isAnswered
                    ? isLastQuestion ? 'Finalizar' : 'Próxima'
                    : 'Responder'}
              </button>
            </>
          )}
        </section>
      </main>
    </>
  )
}
