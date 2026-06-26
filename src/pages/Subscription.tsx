import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Zap, Crown, Check, X, RefreshCw } from 'lucide-react'
import { ThemeToggle } from '../components/ThemeToggle'
import { getSubscription, createCheckoutSession } from '../services/api'
import { cn } from '@/lib/utils'
import type { SubscriptionStatus } from '../types/quiz'

const DAILY_LIMIT = 5

const FREE_FEATURES = [
  'Todas as certificações (CLF-C02, SAA-C03, DVA-C02)',
  `${DAILY_LIMIT} quizzes por dia`,
  'Feedback com IA após cada questão',
  'Histórico dos últimos quizzes',
]

const PREMIUM_FEATURES = [
  'Todas as certificações (CLF-C02, SAA-C03, DVA-C02)',
  'Quizzes ilimitados todos os dias',
  'Feedback com IA após cada questão',
  'Histórico completo e análise de evolução',
  'Plano de estudo personalizado com IA',
  'Suporte prioritário',
]

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

export function Subscription() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [sub, setSub] = useState<SubscriptionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [error, setError] = useState('')

  const success = params.get('success') === 'true'
  const canceled = params.get('canceled') === 'true'

  useEffect(() => {
    getSubscription()
      .then(setSub)
      .catch(() => setError('Não foi possível carregar o status da assinatura.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleUpgrade() {
    setCheckoutLoading(true)
    setError('')
    try {
      const url = await createCheckoutSession()
      window.location.href = url
    } catch {
      setError('Não foi possível iniciar o checkout. Tente novamente.')
      setCheckoutLoading(false)
    }
  }

  const isPremium = sub?.plan === 'premium'

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Início
          </button>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-8">
        <div className="space-y-1">
          <h2 className="font-sans text-2xl font-bold text-foreground">
            Minha <span className="text-primary">Assinatura</span>
          </h2>
          <p className="text-sm text-muted-foreground">Gerencie seu plano e acesso ao QuizApp</p>
        </div>

        {/* Success / canceled alerts */}
        {success && (
          <div className="flex items-center gap-3 rounded-xl border border-success/20 bg-success/5 px-4 py-3">
            <Check className="h-5 w-5 flex-shrink-0 text-success" />
            <div>
              <p className="font-sans text-sm font-semibold text-success">Assinatura ativada!</p>
              <p className="text-xs text-muted-foreground">Bem-vindo ao Premium. Aproveite quizzes ilimitados.</p>
            </div>
          </div>
        )}
        {canceled && (
          <div className="flex items-center gap-3 rounded-xl border border-warning/20 bg-warning/5 px-4 py-3">
            <X className="h-5 w-5 flex-shrink-0 text-warning" />
            <p className="text-sm text-muted-foreground">Pagamento cancelado. Você não foi cobrado.</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div>
        ) : (
          <>
            {/* Current plan banner */}
            <div className={cn(
              'rounded-2xl border p-5 flex items-center gap-4',
              isPremium
                ? 'border-primary/20 bg-primary/5'
                : 'border-border bg-card',
            )}>
              <div className={cn(
                'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl',
                isPremium ? 'bg-primary/15' : 'bg-muted',
              )}>
                {isPremium
                  ? <Crown className="h-5 w-5 text-primary" />
                  : <Zap className="h-5 w-5 text-muted-foreground" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-sans text-sm font-semibold text-foreground">
                  Plano {isPremium ? 'Premium' : 'Gratuito'}
                </p>
                {isPremium && sub?.currentPeriodEnd ? (
                  <p className="text-xs text-muted-foreground">
                    Renova em {formatDate(sub.currentPeriodEnd)}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {sub?.quizzesToday ?? 0}/{DAILY_LIMIT} quizzes usados hoje
                  </p>
                )}
              </div>
              {isPremium && (
                <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white flex-shrink-0">
                  ATIVO
                </span>
              )}
            </div>

            {/* Plan comparison */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Free card */}
              <div className={cn(
                'rounded-xl border p-5 space-y-4',
                !isPremium ? 'border-border bg-card ring-2 ring-border' : 'border-border bg-card opacity-60',
              )}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <span className="font-sans text-sm font-bold text-foreground">Gratuito</span>
                    {!isPremium && <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">Atual</span>}
                  </div>
                  <p className="font-sans text-2xl font-extrabold text-foreground">R$ 0</p>
                </div>
                <ul className="space-y-2">
                  {FREE_FEATURES.map((f) => (
                    <li key={f} className="flex gap-2 text-xs text-muted-foreground">
                      <Check className="h-3.5 w-3.5 flex-shrink-0 text-success mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Premium card */}
              <div className={cn(
                'rounded-xl border p-5 space-y-4',
                isPremium
                  ? 'border-primary/30 bg-primary/5 ring-2 ring-primary/30'
                  : 'border-primary/20 bg-card',
              )}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-primary" />
                    <span className="font-sans text-sm font-bold text-primary">Premium</span>
                    {isPremium && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">Atual</span>}
                  </div>
                  <div className="flex items-end gap-1">
                    <p className="font-sans text-2xl font-extrabold text-foreground">R$ 19</p>
                    <p className="mb-0.5 text-xs text-muted-foreground">/mês</p>
                  </div>
                </div>
                <ul className="space-y-2">
                  {PREMIUM_FEATURES.map((f) => (
                    <li key={f} className="flex gap-2 text-xs text-foreground">
                      <Check className="h-3.5 w-3.5 flex-shrink-0 text-primary mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* CTA */}
            {!isPremium && (
              <button
                onClick={handleUpgrade}
                disabled={checkoutLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-sans text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {checkoutLoading ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Abrindo checkout...</>
                ) : (
                  <><Crown className="h-4 w-4" /> Assinar Premium — R$ 19/mês</>
                )}
              </button>
            )}

            {error && (
              <p className="text-center text-sm text-danger">{error}</p>
            )}
          </>
        )}
      </main>
    </div>
  )
}
