interface ProgressBarProps {
  current: number
  total: number
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const percent = Math.round((current / total) * 100)

  return (
    <div className="barra_progresso">
      <div style={{ width: `${percent}%` }} />
    </div>
  )
}
