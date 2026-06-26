import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'
import { cn } from '@/lib/utils'

export function ThemeToggle() {
  const { isDark, toggle } = useTheme()

  return (
    <button
      onClick={toggle}
      aria-label="Alternar tema claro/escuro"
      className={cn(
        'flex items-center gap-2 rounded-full px-3 py-1.5',
        'border border-border bg-card text-muted-foreground',
        'hover:border-primary/40 hover:text-foreground',
        'transition-all duration-200',
      )}
    >
      <Sun className="h-4 w-4" />
      <div className={cn(
        'relative h-5 w-9 rounded-full transition-colors duration-200',
        isDark ? 'bg-primary' : 'bg-muted',
      )}>
        <div className={cn(
          'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm',
          'transition-transform duration-200',
          isDark ? 'translate-x-4' : 'translate-x-0.5',
        )} />
      </div>
      <Moon className="h-4 w-4" />
    </button>
  )
}
