import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { getSubscription } from '../services/api'
import { Logo } from '../components/Logo'
import { ThemeToggle } from '../components/ThemeToggle'

const FEATURES = [
  'Quizzes ilimitados todos os dias',
  'Modo simulado de prova oficial',
  'Plano de estudo personalizado com IA',
]

const PIECES = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  left: `${4 + i * 8}%`,
  color: ['#3B39E8', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6'][i % 5],
  delay: `${(i * 0.14).toFixed(2)}s`,
  width: `${8 + (i % 3) * 5}px`,
  height: `${10 + (i % 4) * 4}px`,
}))

export function PaymentSuccess() {
  const navigate = useNavigate()
  const [confirmed, setConfirmed] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let attempts = 0
    const MAX = 10

    async function poll() {
      try {
        const sub = await getSubscription()
        if (sub?.plan === 'premium') {
          setConfirmed(true)
          setChecking(false)
          return
        }
      } catch {}
      attempts++
      if (attempts < MAX) {
        setTimeout(poll, 3000)
      } else {
        setConfirmed(true)
        setChecking(false)
      }
    }

    poll()
  }, [])

  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-background">
      {/* Confetti */}
      {confirmed && PIECES.map(({ id, left, color, delay, width, height }) => (
        <div
          key={id}
          className="confetti-piece"
          style={{ left, animationDelay: delay, width, height, backgroundColor: color } as React.CSSProperties}
        />
      ))}

      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <Logo />
        <ThemeToggle />
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-8 px-6 py-12 text-center">
        {checking ? (
          <div className="space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <p className="font-sans text-lg font-semibold text-foreground">Ativando sua assinatura…</p>
            <p className="text-sm text-muted-foreground">Aguarde, estamos confirmando seu pagamento.</p>
          </div>
        ) : (
          <>
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full"
              style={{ backgroundColor: '#22C55E1A' }}
            >
              <CheckCircle className="h-14 w-14" style={{ color: '#22C55E' }} />
            </div>

            <div className="space-y-2">
              <h1 className="font-sans text-3xl font-extrabold text-foreground">Bem-vindo ao Premium! 🎉</h1>
              <p className="text-base text-muted-foreground">
                Sua assinatura está ativa. Agora você tem acesso ilimitado.
              </p>
            </div>

            <ul className="w-full space-y-3 text-left">
              {FEATURES.map(f => (
                <li
                  key={f}
                  className="flex items-center gap-3 rounded-xl border px-4 py-3"
                  style={{ borderColor: '#22C55E33', backgroundColor: '#22C55E0D' }}
                >
                  <CheckCircle className="h-4 w-4 flex-shrink-0" style={{ color: '#22C55E' }} />
                  <span className="text-sm font-medium text-foreground">{f}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => navigate('/app')}
              className="w-full rounded-xl bg-primary py-3.5 font-sans text-sm font-bold text-white hover:bg-primary-hover transition-colors duration-150"
            >
              Começar a estudar
            </button>
          </>
        )}
      </main>
    </div>
  )
}
