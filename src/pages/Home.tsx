import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ThemeToggle } from '../components/ThemeToggle'
import { useQuizStore } from '../store/quizStore'
import { useAuthStore } from '../store/authStore'
import { CERTIFICATIONS } from '../data/certifications'

const DIFFICULTIES = [
  { label: 'Fácil', icon: '/assets/images/icon-fácil.svg', bg: 'var(--bg-facil)' },
  { label: 'Médio', icon: '/assets/images/icon-médio.svg', bg: 'var(--bg-medio)' },
  { label: 'Difícil', icon: '/assets/images/icon-difícil.svg', bg: 'var(--bg-dificil)' },
]

export function Home() {
  const navigate = useNavigate()
  const { setCertification, setSubject } = useQuizStore()
  const { email, signOut } = useAuthStore()
  const [selectedCert, setSelectedCert] = useState('')

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  function handleSelectDifficulty(label: string) {
    setCertification(selectedCert)
    setSubject(label)
    navigate('/quiz')
  }

  return (
    <>
      <header style={{ justifyContent: 'space-between' }}>
        <span className="header-email">{email}</span>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="logout-btn" onClick={() => navigate('/historico')}>Histórico</button>
          <ThemeToggle />
          <button className="logout-btn" onClick={handleLogout}>Sair</button>
        </div>
      </header>

      <main>
        <section className="boas_vindas">
          <h1>Prepare-se para sua<br /><strong>Certificação AWS!</strong></h1>
          <p>Escolha a certificação e a dificuldade</p>
        </section>

        <section className="cert-step">
          <p className="step-label">1. Selecione a certificação</p>
          <div className="cert-cards">
            {CERTIFICATIONS.map((cert) => (
              <button
                key={cert.id}
                className={`cert-card${selectedCert === cert.id ? ' selected' : ''}`}
                style={{ '--cert-color': cert.color } as React.CSSProperties}
                onClick={() => setSelectedCert(cert.id)}
              >
                <span className="cert-code">{cert.code}</span>
                <span className="cert-name">{cert.name}</span>
                <span className="cert-level">{cert.level}</span>
              </button>
            ))}
          </div>
        </section>

        {selectedCert && (
          <section className="assuntos" style={{ animation: 'fadeIn 0.25s ease' }}>
            <p className="step-label">2. Selecione a dificuldade</p>
            {DIFFICULTIES.map(({ label, icon, bg }) => (
              <button key={label} onClick={() => handleSelectDifficulty(label)}>
                <div style={{ background: bg }}>
                  <img src={icon} alt={label} />
                </div>
                <span>{label}</span>
              </button>
            ))}
          </section>
        )}
      </main>
    </>
  )
}
