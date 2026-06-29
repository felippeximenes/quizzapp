import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, AlertCircle, Loader2 } from 'lucide-react'
import { register, confirmEmail, login, resendCode } from '../services/auth'
import { useAuthStore } from '../store/authStore'
import { ThemeToggle } from '../components/ThemeToggle'
import { Logo } from '../components/Logo'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'register' | 'confirm'

const BULLETS = [
  'Questões de certificações AWS com IA',
  'Feedback detalhado em cada resposta',
  'Plano de estudos personalizado',
]

const AVATARS = [
  { initials: 'AM', bg: '#3B39E8' },
  { initials: 'JS', bg: '#22C55E' },
  { initials: 'RK', bg: '#F59E0B' },
]

export function Login() {
  const navigate = useNavigate()
  const setEmail = useAuthStore((s) => s.setEmail)

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmailInput] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      await login(email, password)
      setEmail(email)
      navigate('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar')
    } finally { setLoading(false) }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (password !== confirm) { setError('As senhas não coincidem'); return }
    setLoading(true)
    try {
      await register(email, password)
      setMode('confirm')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta')
    } finally { setLoading(false) }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      await confirmEmail(email, code)
      await login(email, password)
      setEmail(email)
      navigate('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Código inválido')
    } finally { setLoading(false) }
  }

  async function handleResend() {
    try {
      await resendCode(email)
      setError('Novo código enviado para o seu e-mail.')
    } catch { setError('Não foi possível reenviar o código.') }
  }

  const inputClass = cn(
    'w-full rounded-[10px] border border-[#C7D2FE] bg-background px-4 py-3',
    'text-sm font-body text-foreground placeholder:text-muted-foreground',
    'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20',
    'dark:border-[#312E81] transition-colors duration-150',
  )

  const btnClass =
    'flex w-full items-center justify-center gap-2 rounded-[10px] bg-primary py-3 text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-40 transition-colors duration-150'

  const desktopTitle: Record<Mode, string> = {
    login: 'Bem-vindo de volta',
    register: 'Crie sua conta',
    confirm: 'Verifique seu e-mail',
  }

  return (
    <div className="flex min-h-svh">

      {/* ── Left panel — desktop only ─────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-10"
        style={{ background: 'linear-gradient(135deg, #3B39E8 0%, #0F0E2E 100%)' }}
      >
        <Logo variant="light" size="lg" />

        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="font-sans text-3xl font-extrabold leading-tight text-white">
              Estude com inteligência.<br />Certifique-se com confiança.
            </h1>
            <p className="text-base leading-relaxed text-white/70">
              Questões geradas por IA, feedback personalizado e plano de estudos sob medida.
            </p>
          </div>

          <ul className="space-y-3">
            {BULLETS.map((item) => (
              <li key={item} className="flex items-center gap-3">
                <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#22C55E]/20">
                  <Check className="h-3 w-3 text-[#22C55E]" />
                </div>
                <span className="text-sm text-white/80">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {AVATARS.map(({ initials, bg }) => (
              <div
                key={initials}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white"
                style={{ backgroundColor: bg }}
              >
                {initials}
              </div>
            ))}
          </div>
          <p className="text-xs text-white/60">Mais de 500 questões praticadas essa semana</p>
        </div>
      </div>

      {/* ── Right panel — form ────────────────────────────────────── */}
      <div className="relative flex w-full flex-col items-center justify-center bg-background px-6 py-10 lg:w-1/2">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        {/* Mobile logo */}
        <div className="mb-8 lg:hidden">
          <Logo size="lg" />
        </div>

        <div className="w-full max-w-sm space-y-6">

          {/* Desktop subtitle */}
          <div className="hidden lg:block space-y-1">
            <h2 className="font-sans text-xl font-bold text-foreground">{desktopTitle[mode]}</h2>
            <p className="text-sm text-muted-foreground">
              {mode === 'confirm'
                ? <>Enviamos um código para <strong className="text-foreground">{email}</strong></>
                : 'Acesse sua conta Certara'}
            </p>
          </div>

          {/* Mode tabs */}
          {mode !== 'confirm' && (
            <div className="flex overflow-hidden rounded-xl border border-border">
              {(['login', 'register'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError('') }}
                  className={cn(
                    'flex-1 py-2.5 text-sm font-semibold transition-colors duration-150',
                    mode === m ? 'bg-primary text-white' : 'bg-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  {m === 'login' ? 'Entrar' : 'Criar conta'}
                </button>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className={cn(
              'flex items-center gap-2 text-sm',
              error.includes('enviado') ? 'text-success' : 'text-danger',
            )}>
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Login form */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">E-mail</span>
                <input type="email" value={email} onChange={e => setEmailInput(e.target.value)} required autoFocus className={inputClass} placeholder="voce@email.com" />
              </label>
              <label className="block space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Senha</span>
                  <button type="button" className="text-xs text-primary hover:underline">Esqueci a senha</button>
                </div>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className={inputClass} placeholder="••••••••" />
              </label>
              <button type="submit" disabled={loading} className={btnClass}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Entrando…</> : 'Entrar'}
              </button>
            </form>
          )}

          {/* Register form */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">E-mail</span>
                <input type="email" value={email} onChange={e => setEmailInput(e.target.value)} required autoFocus className={inputClass} placeholder="voce@email.com" />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Senha (mín. 8 caracteres)</span>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} className={inputClass} placeholder="••••••••" />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Confirmar senha</span>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8} className={inputClass} placeholder="••••••••" />
              </label>
              <button type="submit" disabled={loading} className={btnClass}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Criando conta…</> : 'Criar conta'}
              </button>
            </form>
          )}

          {/* Confirm email form */}
          {mode === 'confirm' && (
            <form onSubmit={handleConfirm} className="space-y-4">
              <p className="text-center text-sm leading-relaxed text-muted-foreground lg:hidden">
                Enviamos um código para <strong className="text-foreground">{email}</strong>
              </p>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Código de verificação</span>
                <input
                  type="text" value={code} onChange={e => setCode(e.target.value)}
                  required autoFocus inputMode="numeric" maxLength={6}
                  className={cn(inputClass, 'text-center text-xl tracking-[0.5em] font-bold')}
                  placeholder="000000"
                />
              </label>
              <button type="submit" disabled={loading} className={btnClass}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verificando…</> : 'Confirmar e-mail'}
              </button>
              <button type="button" onClick={handleResend} className="w-full text-sm text-primary hover:underline">
                Reenviar código
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
