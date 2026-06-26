import { create } from 'zustand'
import type { QuizAnswer } from '../types/quiz'

interface QuizState {
  certification: string
  subject: string
  score: number
  answers: QuizAnswer[]
  setCertification: (certification: string) => void
  setSubject: (subject: string) => void
  setScore: (score: number) => void
  addAnswer: (answer: QuizAnswer) => void
  reset: () => void
}

export const useQuizStore = create<QuizState>((set) => ({
  certification: '',
  subject: '',
  score: 0,
  answers: [],
  setCertification: (certification) => set({ certification }),
  setSubject: (subject) => set({ subject }),
  setScore: (score) => set({ score }),
  addAnswer: (answer) => set((state) => ({ answers: [...state.answers, answer] })),
  reset: () => set({ certification: '', subject: '', score: 0, answers: [] }),
}))
