import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ThemeToggle } from '../components/ThemeToggle'
import { SubjectBadge } from '../components/SubjectBadge'
import { ProgressBar } from '../components/ProgressBar'
import { useQuizStore } from '../store/quizStore'
import type { QuizData } from '../types/quiz'
import questionsData from '../data/questions.json'

const TOTAL = 10
const OPTION_LABELS = ['A', 'B', 'C', 'D']
const data = questionsData as QuizData

type Phase = 'selecting' | 'answered'

function getOptionClass(
  index: number,
  selected: number | null,
  correctIndex: number,
  phase: Phase
): string {
  if (phase === 'selecting') return selected === index ? 'selected' : ''
  if (index === correctIndex) return 'correta'
  if (index === selected) return 'errada'
  return ''
}

export function Quiz() {
  const navigate = useNavigate()
  const subject = useQuizStore((s) => s.subject)
  const storeSetScore = useQuizStore((s) => s.setScore)

  const quiz = data.quizzes.find((q) => q.title === subject)

  const [currentQ, setCurrentQ] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [phase, setPhase] = useState<Phase>('selecting')
  const [localScore, setLocalScore] = useState(0)

  if (!quiz || !subject) {
    navigate('/')
    return null
  }

  const question = quiz.questions[currentQ]
  const correctIndex = question.options.indexOf(question.answer)
  const isLastQuestion = currentQ === TOTAL - 1

  function handleSelect(index: number) {
    if (phase === 'answered') return
    setSelected(index)
  }

  function handleAnswer() {
    if (selected === null) return
    if (selected === correctIndex) setLocalScore((s) => s + 1)
    setPhase('answered')
  }

  function handleNext() {
    if (isLastQuestion) {
      const finalScore = localScore + (selected === correctIndex ? 1 : 0)
      storeSetScore(finalScore)
      navigate('/resultado')
    } else {
      setCurrentQ((q) => q + 1)
      setSelected(null)
      setPhase('selecting')
    }
  }

  const buttonLabel =
    phase === 'selecting' ? 'Responder' : isLastQuestion ? 'Finalizar' : 'Próxima'

  const handleButtonClick = phase === 'selecting' ? handleAnswer : handleNext

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
            <h2>{question.question}</h2>
          </div>
          <ProgressBar current={currentQ + 1} total={TOTAL} />
        </section>

        <section className="alternativas">
          <form onSubmit={(e) => e.preventDefault()}>
            {question.options.map((option, index) => (
              <label
                key={index}
                className={getOptionClass(index, selected, correctIndex, phase)}
                onClick={() => handleSelect(index)}
              >
                <input
                  type="radio"
                  name="alternativa"
                  value={option}
                  readOnly
                  checked={selected === index}
                />
                <span className="option-letter">{OPTION_LABELS[index]}</span>
                {option}
              </label>
            ))}
          </form>

          <button
            className="btn-action"
            onClick={handleButtonClick}
            disabled={phase === 'selecting' && selected === null}
          >
            {buttonLabel}
          </button>
        </section>
      </main>
    </>
  )
}
