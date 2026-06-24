import { useTheme } from '../hooks/useTheme'

export function ThemeToggle() {
  const { isDark, toggle } = useTheme()

  return (
    <div className="tema">
      <img src="/assets/images/icon-sun-dark.svg" alt="Tema claro" />
      <button
        onClick={toggle}
        style={{ justifyContent: isDark ? 'flex-end' : 'flex-start' }}
        aria-label="Alternar tema claro/escuro"
      >
        <div />
      </button>
      <img src="/assets/images/icon-moon-dark.svg" alt="Tema escuro" />
    </div>
  )
}
