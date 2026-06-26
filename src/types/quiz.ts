export interface Question {
  question: string
  options: string[]
  answer: string
}

export interface QuizItem {
  title: string
  icon: string
  questions: Question[]
}

export interface QuizData {
  quizzes: QuizItem[]
}

export interface ApiQuestion {
  question: string
  options: string[]   // ["A) ...", "B) ...", "C) ...", "D) ..."]
  answer: string      // "A" | "B" | "C" | "D"
  explanation: string
  domain: string
  difficulty: string
}

export interface ApiFeedback {
  correct: boolean
  feedback: string
  study_tips: string[]
  aws_docs_topic: string
}

export interface QuizAnswer {
  domain: string
  difficulty: string
  correct: boolean
}

export interface ApiSummary {
  encouragement: string
  strong_areas: string[]
  weak_areas: string[]
  study_plan: string[]
  next_step: string
}

export interface QuizHistoryItem {
  quizId: string
  date: string
  score: number
  total: number
  pct: number
  difficulty: string
  domains: Record<string, { correct: number; total: number }>
}

export interface SubscriptionStatus {
  plan: 'free' | 'premium'
  quizzesRemaining: number | null
  quizzesToday: number
  dailyLimit?: number
  status?: string
  currentPeriodEnd?: number
  stripeSubscriptionId?: string
}
