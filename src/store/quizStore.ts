import { create } from 'zustand'

interface QuizState {
  subject: string
  score: number
  setSubject: (subject: string) => void
  setScore: (score: number) => void
  reset: () => void
}

export const useQuizStore = create<QuizState>((set) => ({
  subject: '',
  score: 0,
  setSubject: (subject) => set({ subject }),
  setScore: (score) => set({ score }),
  reset: () => set({ subject: '', score: 0 }),
}))
