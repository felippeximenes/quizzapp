import { useNavigate } from 'react-router-dom'
import { ThemeToggle } from '../components/ThemeToggle'
import { SubjectBadge } from '../components/SubjectBadge'
import { useQuizStore } from '../store/quizStore'

export function Result() {
  const navigate = useNavigate()
  const subject = useQuizStore((s) => s.subject)
  const score = useQuizStore((s) => s.score)
  const reset = useQuizStore((s) => s.reset)

  if (!subject) {
    navigate('/')
    return null
  }

  function handlePlayAgain() {
    reset()
    navigate('/')
  }

  return (
    <>
      <header>
        <SubjectBadge subject={subject} />
        <ThemeToggle />
      </header>

      <main className="result">
        <h2 className="result-title">
          Quiz <strong>Concluído!</strong>
        </h2>

        <div>
          <section className="pontuacao">
            <SubjectBadge subject={subject} />
            <strong>{score}</strong>
            <p>de 10</p>
          </section>

          <button className="btn-action result-btn" onClick={handlePlayAgain}>
            Jogar Novamente
          </button>
        </div>
      </main>
    </>
  )
}
