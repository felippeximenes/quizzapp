const iconMap: Record<string, string> = {
  fácil: '/assets/images/icon-fácil.svg',
  médio: '/assets/images/icon-médio.svg',
  difícil: '/assets/images/icon-difícil.svg',
}

const bgMap: Record<string, string> = {
  fácil: 'var(--bg-facil)',
  médio: 'var(--bg-medio)',
  difícil: 'var(--bg-dificil)',
}

interface SubjectBadgeProps {
  subject: string
}

export function SubjectBadge({ subject }: SubjectBadgeProps) {
  const key = subject.toLowerCase()

  return (
    <div className="assunto">
      <div className="assunto_icone" style={{ background: bgMap[key] }}>
        <img src={iconMap[key]} alt={`Ícone ${subject}`} />
      </div>
      <h1>{subject}</h1>
    </div>
  )
}
