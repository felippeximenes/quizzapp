import { create } from 'zustand'
import { getCurrentEmail, logout } from '../services/auth'

interface AuthState {
  email: string | null
  loading: boolean
  setEmail: (email: string | null) => void
  init: () => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  email: null,
  loading: true,

  setEmail: (email) => set({ email }),

  init: async () => {
    const email = await getCurrentEmail()
    set({ email, loading: false })
  },

  signOut: async () => {
    await logout()
    set({ email: null })
  },
}))
