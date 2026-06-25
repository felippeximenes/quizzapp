import type { ApiQuestion, ApiFeedback, ApiSummary, QuizAnswer } from '../types/quiz'

const API_URL = import.meta.env.VITE_API_URL ?? ''

export async function generateQuestion(domain: string, difficulty: string): Promise<ApiQuestion> {
  const res = await fetch(`${API_URL}/generate-question`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain, difficulty }),
  })
  if (!res.ok) throw new Error('Failed to generate question')
  return res.json() as Promise<ApiQuestion>
}

interface EvaluatePayload {
  question: string
  options: string[]
  correct_answer: string
  selected_answer: string
  domain: string
  explanation: string
}

export async function evaluateAnswer(payload: EvaluatePayload): Promise<ApiFeedback> {
  const res = await fetch(`${API_URL}/evaluate-answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to evaluate answer')
  return res.json() as Promise<ApiFeedback>
}

export async function generateSummary(
  score: number,
  total: number,
  answers: QuizAnswer[],
): Promise<ApiSummary> {
  const res = await fetch(`${API_URL}/generate-summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ score, total, answers }),
  })
  if (!res.ok) throw new Error('Failed to generate summary')
  return res.json() as Promise<ApiSummary>
}
