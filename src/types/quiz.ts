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
