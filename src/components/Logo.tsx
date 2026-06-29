import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'light' | 'dark'
  className?: string
}

const sizes = {
  sm: { width: 20, height: 17, text: 'text-sm' },
  md: { width: 28, height: 24, text: 'text-base' },
  lg: { width: 40, height: 34, text: 'text-xl' },
}

export function Logo({ size = 'md', variant = 'dark', className }: LogoProps) {
  const { width, height, text } = sizes[size]

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect x="0" y="14.4" width="6" height="9.6" rx="3" fill={variant === 'light' ? 'rgba(255,255,255,0.7)' : '#3B39E8'} />
        <rect x="9" y="7.2" width="6" height="16.8" rx="3" fill={variant === 'light' ? 'rgba(255,255,255,0.9)' : '#3B39E8'} />
        <rect x="18" y="0" width="6" height="24" rx="3" fill="#22C55E" />
      </svg>
      <span
        className={cn(
          'font-sans font-bold tracking-tight',
          text,
          variant === 'light'
            ? 'text-white'
            : 'text-[#1E1B4B] dark:text-white',
        )}
      >
        Certara
      </span>
    </div>
  )
}
