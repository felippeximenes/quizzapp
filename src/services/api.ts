import type { ApiQuestion, ApiFeedback, ApiSummary, QuizAnswer, QuizHistoryItem, SubscriptionStatus } from '../types/quiz'
import { getIdToken } from './auth'

const API_URL = import.meta.env.VITE_API_URL ?? ''

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getIdToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function generateQuestion(
  domain: string,
  difficulty: string,
  certification = 'clf-c02',
): Promise<ApiQuestion> {
  const res = await fetch(`${API_URL}/generate-question`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ domain, difficulty, certification }),
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
  certification?: string
}

export async function evaluateAnswer(payload: EvaluatePayload): Promise<ApiFeedback> {
  const res = await fetch(`${API_URL}/evaluate-answer`, {
    method: 'POST',
    headers: await authHeaders(),
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
    headers: await authHeaders(),
    body: JSON.stringify({ score, total, answers }),
  })
  if (!res.ok) throw new Error('Failed to generate summary')
  return res.json() as Promise<ApiSummary>
}

export async function saveQuiz(
  score: number,
  total: number,
  difficulty: string,
  answers: QuizAnswer[],
): Promise<void> {
  const res = await fetch(`${API_URL}/save-quiz`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ score, total, difficulty, answers }),
  })
  if (!res.ok) throw new Error('Failed to save quiz')
}

export async function listHistory(): Promise<QuizHistoryItem[]> {
  const res = await fetch(`${API_URL}/history`, {
    method: 'GET',
    headers: await authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to load history')
  const data = await res.json() as { items: QuizHistoryItem[] }
  return data.items
}

export async function getSubscription(): Promise<SubscriptionStatus> {
  const res = await fetch(`${API_URL}/subscription`, {
    method: 'GET',
    headers: await authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to get subscription')
  return res.json() as Promise<SubscriptionStatus>
}

export async function createPortalSession(): Promise<string> {
  const res = await fetch(`${API_URL}/customer-portal`, {
    method: 'POST',
    headers: await authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to create portal session')
  const data = await res.json() as { portalUrl: string }
  return data.portalUrl
}

export async function cancelSubscription(): Promise<void> {
  const res = await fetch(`${API_URL}/cancel-subscription`, {
    method: 'POST',
    headers: await authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to cancel subscription')
}

export async function createCheckoutSession(): Promise<string> {
  const res = await fetch(`${API_URL}/create-checkout-session`, {
    method: 'POST',
    headers: await authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to create checkout session')
  const data = await res.json() as { checkoutUrl: string }
  return data.checkoutUrl
}
