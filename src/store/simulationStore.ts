import { create } from 'zustand'
import type { ApiQuestion } from '../types/quiz'

export type SimPhase = 'config' | 'running' | 'results'

export const SIM_TOTAL = 65
export const SIM_TIME = 130 * 60 // 7800 seconds

const DIFF_PATTERN = ['medium', 'medium', 'easy', 'medium', 'hard', 'medium', 'easy', 'medium']
export function diffForIndex(i: number): string {
  return DIFF_PATTERN[i % DIFF_PATTERN.length]
}

interface SimulationState {
  phase: SimPhase
  certification: string
  questions: (ApiQuestion | null)[]
  selectedAnswers: (number | null)[]
  currentIndex: number
  timeRemaining: number

  startSim: (certification: string) => void
  setQuestion: (index: number, q: ApiQuestion) => void
  setAnswer: (index: number, answerIdx: number) => void
  goTo: (index: number) => void
  tick: () => boolean // returns true if time ran out
  finish: () => void
  reset: () => void
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  phase: 'config',
  certification: '',
  questions: Array<ApiQuestion | null>(SIM_TOTAL).fill(null),
  selectedAnswers: Array<number | null>(SIM_TOTAL).fill(null),
  currentIndex: 0,
  timeRemaining: SIM_TIME,

  startSim: (certification) => set({
    phase: 'running',
    certification,
    questions: Array<ApiQuestion | null>(SIM_TOTAL).fill(null),
    selectedAnswers: Array<number | null>(SIM_TOTAL).fill(null),
    currentIndex: 0,
    timeRemaining: SIM_TIME,
  }),

  setQuestion: (index, q) => set((state) => {
    const questions = [...state.questions]
    questions[index] = q
    return { questions }
  }),

  setAnswer: (index, answerIdx) => set((state) => {
    const selectedAnswers = [...state.selectedAnswers]
    selectedAnswers[index] = answerIdx
    return { selectedAnswers }
  }),

  goTo: (index) => set({ currentIndex: index }),

  tick: () => {
    const { timeRemaining } = get()
    if (timeRemaining <= 1) {
      set({ timeRemaining: 0, phase: 'results' })
      return true
    }
    set({ timeRemaining: timeRemaining - 1 })
    return false
  },

  finish: () => set({ phase: 'results' }),

  reset: () => set({
    phase: 'config',
    certification: '',
    questions: Array<ApiQuestion | null>(SIM_TOTAL).fill(null),
    selectedAnswers: Array<number | null>(SIM_TOTAL).fill(null),
    currentIndex: 0,
    timeRemaining: SIM_TIME,
  }),
}))
