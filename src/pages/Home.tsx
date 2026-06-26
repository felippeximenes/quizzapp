import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { History, LogOut, Zap, Star, Trophy } from 'lucide-react'
import { ThemeToggle } from '../components/ThemeToggle'
import { useQuizStore } from '../store/quizStore'
import { useAuthStore } from '../store/authStore'
import { CERTIFICATIONS } from '../data/certifications'
import { cn } from '@/lib/utils'

const DIFFICULTIES = [
  { label: 'Fácil', value: 'easy', icon: Zap, color: 'text-accent', bg: 'bg-accent/10 hover:bg-accent/20', border: 'hover:border-accent/50', desc: 'Conceitos fundamentais' },
  { label: 'Médio', value: 'medium', icon: Star, color: 'text-warning', bg: 'bg-warning/10 hover:bg-warning/20', border: 'hover:border-warning/50', desc: 'Cenários práticos' },
  { label: 'Difícil', value: 'hard', icon: Trophy, color: 'text-danger', bg: 'bg-danger/10 hover:bg-danger/20', border: 'hover:border-danger/50', desc: 'Trade-offs arquiteturais' },
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
    <div className="flex min-h-svh flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <span className="truncate text-sm text-muted-foreground max-w-[180px]">{email}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/historico')}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors">
              <History className="h-3.5 w-3.5" />
              Histórico
            </button>
            <ThemeToggle />
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-danger/40 hover:text-danger transition-colors">
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-8 px-4 py-8">
        <div className="space-y-1">
          <h1 className="font-sans text-2xl font-bold text-foreground">
            Prepare-se para sua<br />
            <span className="text-primary">Certificação AWS</span>
          </h1>
          <p className="text-sm text-muted-foreground">Questões geradas por IA com base em documentação oficial</p>
        </div>

        {/* Cert selection */}
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            1. Selecione a certificação
          </p>
          <div className="space-y-2">
            {CERTIFICATIONS.map((cert) => (
              <button
                key={cert.id}
                onClick={() => setSelectedCert(cert.id)}
                className={cn(
                  'w-full flex items-center gap-4 rounded-xl border bg-card px-4 py-3.5',
                  'text-left transition-all duration-200',
                  selectedCert === cert.id
                    ? 'border-primary shadow-md shadow-primary/10 bg-primary/5'
                    : 'border-border hover:border-primary/30 hover:shadow-sm',
                )}
              >
                <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: cert.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-sans text-sm font-bold" style={{ color: cert.color }}>{cert.code}</span>
                    <span className="font-sans text-sm font-semibold text-foreground">{cert.name}</span>
                  </div>
                </div>
                <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground flex-shrink-0">
                  {cert.level}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Difficulty selection */}
        {selectedCert && (
          <section className="space-y-3 animate-fade-in">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              2. Selecione a dificuldade
            </p>
            <div className="grid grid-cols-3 gap-3">
              {DIFFICULTIES.map(({ label, icon: Icon, color, bg, border, desc }) => (
                <button
                  key={label}
                  onClick={() => handleSelectDifficulty(label)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border border-border p-4',
                    'transition-all duration-200 hover:shadow-md active:scale-95',
                    bg, border,
                  )}
                >
                  <div className={cn('rounded-lg p-2', bg)}>
                    <Icon className={cn('h-5 w-5', color)} />
                  </div>
                  <span className="font-sans text-sm font-semibold text-foreground">{label}</span>
                  <span className="text-center text-xs text-muted-foreground leading-tight">{desc}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
