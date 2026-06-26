import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { register, confirmEmail, login, resendCode } from '../services/auth'
import { useAuthStore } from '../store/authStore'
import { ThemeToggle } from '../components/ThemeToggle'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'register' | 'confirm'

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
    'w-full rounded-md border border-border bg-background px-3 py-2.5',
    'text-sm font-body text-foreground placeholder:text-muted-foreground',
    'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
    'transition-colors duration-150',
  )

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-1">
          <h1 className="font-sans text-2xl font-bold text-foreground">
            AWS <span className="text-primary">QuizApp</span>
          </h1>
          <p className="text-sm text-muted-foreground">Prepare-se para o CLF-C02</p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-card shadow-md p-6 space-y-5">

          {mode !== 'confirm' && (
            <div className="flex rounded-lg overflow-hidden border border-border">
              {(['login', 'register'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError('') }}
                  className={cn(
                    'flex-1 py-2 text-sm font-medium transition-colors duration-150',
                    mode === m
                      ? 'bg-primary text-white'
                      : 'bg-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  {m === 'login' ? 'Entrar' : 'Criar conta'}
                </button>
              ))}
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">E-mail</span>
                <input type="email" value={email} onChange={e => setEmailInput(e.target.value)} required autoFocus className={inputClass} placeholder="voce@email.com" />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Senha</span>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className={inputClass} placeholder="••••••••" />
              </label>
              {error && <p className="text-sm text-danger text-center">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-40 transition-colors duration-150">
                {loading ? 'Entrando…' : 'Entrar'}
              </button>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">E-mail</span>
                <input type="email" value={email} onChange={e => setEmailInput(e.target.value)} required autoFocus className={inputClass} placeholder="voce@email.com" />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Senha (mín. 8 caracteres)</span>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} className={inputClass} placeholder="••••••••" />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Confirmar senha</span>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8} className={inputClass} placeholder="••••••••" />
              </label>
              {error && <p className="text-sm text-danger text-center">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-40 transition-colors duration-150">
                {loading ? 'Criando conta…' : 'Criar conta'}
              </button>
            </form>
          )}

          {mode === 'confirm' && (
            <form onSubmit={handleConfirm} className="space-y-4">
              <p className="text-sm text-muted-foreground text-center leading-relaxed">
                Enviamos um código para <strong className="text-foreground">{email}</strong>
              </p>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Código de verificação</span>
                <input type="text" value={code} onChange={e => setCode(e.target.value)} required autoFocus inputMode="numeric" maxLength={6} className={cn(inputClass, 'text-center text-lg tracking-widest')} placeholder="000000" />
              </label>
              {error && <p className={cn('text-sm text-center', error.includes('enviado') ? 'text-success' : 'text-danger')}>{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-40 transition-colors duration-150">
                {loading ? 'Verificando…' : 'Confirmar e-mail'}
              </button>
              <button type="button" onClick={handleResend}
                className="w-full text-sm text-primary hover:underline">
                Reenviar código
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
