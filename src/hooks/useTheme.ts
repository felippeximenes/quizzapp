import { useState, useEffect } from 'react'

export function useTheme() {
  const [isDark, setIsDark] = useState(
    () => localStorage.getItem('tema') === 'escuro'
  )

  useEffect(() => {
    document.documentElement.classList.toggle('escuro', isDark)
  }, [isDark])

  const toggle = () => {
    setIsDark((prev) => {
      const next = !prev
      localStorage.setItem('tema', next ? 'escuro' : 'claro')
      return next
    })
  }

  return { isDark, toggle }
}
