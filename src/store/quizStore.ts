import { create } from 'zustand'
import type { QuizAnswer } from '../types/quiz'

interface QuizState {
  subject: string
  score: number
  answers: QuizAnswer[]
  setSubject: (subject: string) => void
  setScore: (score: number) => void
  addAnswer: (answer: QuizAnswer) => void
  reset: () => void
}

export const useQuizStore = create<QuizState>((set) => ({
  subject: '',
  score: 0,
  answers: [],
  setSubject: (subject) => set({ subject }),
  setScore: (score) => set({ score }),
  addAnswer: (answer) => set((state) => ({ answers: [...state.answers, answer] })),
  reset: () => set({ subject: '', score: 0, answers: [] }),
}))
