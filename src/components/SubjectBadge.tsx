import { cn } from '@/lib/utils'

const iconMap: Record<string, string> = {
  fácil: '/assets/images/icon-fácil.svg',
  médio: '/assets/images/icon-médio.svg',
  difícil: '/assets/images/icon-difícil.svg',
}

const bgMap: Record<string, string> = {
  fácil: 'bg-accent/15',
  médio: 'bg-warning/15',
  difícil: 'bg-danger/15',
}

interface SubjectBadgeProps {
  subject: string
}

export function SubjectBadge({ subject }: SubjectBadgeProps) {
  const key = subject.toLowerCase()

  return (
    <div className="flex items-center gap-2.5">
      <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', bgMap[key] ?? 'bg-muted')}>
        <img src={iconMap[key]} alt={`Ícone ${subject}`} className="h-5 w-5" />
      </div>
      <span className="font-sans text-base font-semibold text-foreground">{subject}</span>
    </div>
  )
}
