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
