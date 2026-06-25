import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { register, confirmEmail, login, resendCode } from '../services/auth'
import { useAuthStore } from '../store/authStore'

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
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      setEmail(email)
      navigate('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('As senhas não coincidem'); return }
    setLoading(true)
    try {
      await register(email, password)
      setMode('confirm')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await confirmEmail(email, code)
      await login(email, password)
      setEmail(email)
      navigate('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Código inválido')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    try {
      await resendCode(email)
      setError('Novo código enviado para o seu e-mail.')
    } catch {
      setError('Não foi possível reenviar o código.')
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1 className="auth-logo">AWS Quiz<span>App</span></h1>
        <p className="auth-subtitle">Prepare-se para o CLF-C02</p>

        {mode !== 'confirm' && (
          <div className="auth-tabs">
            <button
              className={mode === 'login' ? 'active' : ''}
              onClick={() => { setMode('login'); setError('') }}
            >Entrar</button>
            <button
              className={mode === 'register' ? 'active' : ''}
              onClick={() => { setMode('register'); setError('') }}
            >Criar conta</button>
          </div>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="auth-form">
            <label>E-mail
              <input type="email" value={email} onChange={e => setEmailInput(e.target.value)} required autoFocus />
            </label>
            <label>Senha
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </label>
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" disabled={loading} className="auth-submit">
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister} className="auth-form">
            <label>E-mail
              <input type="email" value={email} onChange={e => setEmailInput(e.target.value)} required autoFocus />
            </label>
            <label>Senha (mín. 8 caracteres)
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
            </label>
            <label>Confirmar senha
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8} />
            </label>
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" disabled={loading} className="auth-submit">
              {loading ? 'Criando conta…' : 'Criar conta'}
            </button>
          </form>
        )}

        {mode === 'confirm' && (
          <form onSubmit={handleConfirm} className="auth-form">
            <p className="auth-info">
              Enviamos um código de verificação para <strong>{email}</strong>. Digite abaixo para ativar sua conta.
            </p>
            <label>Código de verificação
              <input type="text" value={code} onChange={e => setCode(e.target.value)} required autoFocus inputMode="numeric" maxLength={6} />
            </label>
            {error && <p className={error.includes('enviado') ? 'auth-success' : 'auth-error'}>{error}</p>}
            <button type="submit" disabled={loading} className="auth-submit">
              {loading ? 'Verificando…' : 'Confirmar e-mail'}
            </button>
            <button type="button" className="auth-link" onClick={handleResend}>
              Reenviar código
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
