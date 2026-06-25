import {
  signUp,
  confirmSignUp,
  signIn,
  signOut,
  fetchAuthSession,
  getCurrentUser,
  resendSignUpCode,
} from 'aws-amplify/auth'

export async function register(email: string, password: string) {
  return signUp({ username: email, password, options: { userAttributes: { email } } })
}

export async function confirmEmail(email: string, code: string) {
  return confirmSignUp({ username: email, confirmationCode: code })
}

export async function resendCode(email: string) {
  return resendSignUpCode({ username: email })
}

export async function login(email: string, password: string) {
  return signIn({ username: email, password })
}

export async function logout() {
  return signOut()
}

export async function getIdToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession()
    return session.tokens?.idToken?.toString() ?? null
  } catch {
    return null
  }
}

export async function getCurrentEmail(): Promise<string | null> {
  try {
    const user = await getCurrentUser()
    return user.signInDetails?.loginId ?? null
  } catch {
    return null
  }
}
