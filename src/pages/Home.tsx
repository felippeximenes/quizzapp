import { useNavigate } from 'react-router-dom'
import { ThemeToggle } from '../components/ThemeToggle'
import { useQuizStore } from '../store/quizStore'

const DIFFICULTIES = [
  {
    label: 'Fácil',
    icon: '/assets/images/icon-fácil.svg',
    bg: 'var(--bg-facil)',
  },
  {
    label: 'Médio',
    icon: '/assets/images/icon-médio.svg',
    bg: 'var(--bg-medio)',
  },
  {
    label: 'Difícil',
    icon: '/assets/images/icon-difícil.svg',
    bg: 'var(--bg-dificil)',
  },
]

export function Home() {
  const navigate = useNavigate()
  const setSubject = useQuizStore((s) => s.setSubject)

  function handleSelect(label: string) {
    setSubject(label)
    navigate('/quiz')
  }

  return (
    <>
      <header style={{ justifyContent: 'flex-end' }}>
        <ThemeToggle />
      </header>

      <main>
        <section className="boas_vindas">
          <h1>
            Bem-vindo(a) ao <br />
            <strong>English Quiz!</strong>
          </h1>
          <p>Escolha a dificuldade para começar</p>
        </section>

        <section className="assuntos">
          {DIFFICULTIES.map(({ label, icon, bg }) => (
            <button key={label} onClick={() => handleSelect(label)}>
              <div style={{ background: bg }}>
                <img src={icon} alt={label} />
              </div>
              <span>{label}</span>
            </button>
          ))}
        </section>
      </main>
    </>
  )
}
