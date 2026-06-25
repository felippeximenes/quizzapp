import { useNavigate } from 'react-router-dom'
import { ThemeToggle } from '../components/ThemeToggle'
import { useQuizStore } from '../store/quizStore'
import { useAuthStore } from '../store/authStore'

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
  const { email, signOut } = useAuthStore()

  function handleSelect(label: string) {
    setSubject(label)
    navigate('/quiz')
  }

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  return (
    <>
      <header style={{ justifyContent: 'space-between' }}>
        <span className="header-email">{email}</span>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <ThemeToggle />
          <button className="logout-btn" onClick={handleLogout}>Sair</button>
        </div>
      </header>

      <main>
        <section className="boas_vindas">
          <h1>
            Prepare-se para o <br />
            <strong>AWS CLF-C02!</strong>
          </h1>
          <p>Escolha a dificuldade — perguntas geradas por IA</p>
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
