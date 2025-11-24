import * as api from './api'

type User = {
  email: string
  userId?: number
  role?: 'admin' | 'user'
}

const SESSION_KEY = 'app_session'
const TOKEN_KEY = 'auth_token'

function decodeJWT(token: string): { userId?: number; email?: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    
    const payload = parts[1]
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return {
      userId: decoded.userId ? Number(decoded.userId) : undefined,
      email: decoded.email
    }
  } catch {
    return null
  }
}

export function register(email: string, password: string, name: string) {
  return api.register(email, password, name)
}

export function login(email: string, password: string, role?: 'admin' | 'user') {
  return api.login(email, password).then(result => {
    if (result.ok && result.token) {
      const userInfo = decodeJWT(result.token)
      if (userInfo) {
        const user: User = {
          email: result.email || userInfo.email || email,
          userId: userInfo.userId,
          role: (result.role as 'admin' | 'user') || role || 'user'
        }
        localStorage.setItem(SESSION_KEY, JSON.stringify(user))
      }
    }
    return result
  })
}

export function logout() {
  api.logout()
  localStorage.removeItem(SESSION_KEY)
}

export function currentUser(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    
    const user = JSON.parse(raw) as User
    const token = api.getAuthTokenFromStorage()
    if (!token) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    
    return user
  } catch {
    return null
  }
}

export async function updatePassword(email: string, newPassword: string) {
  return api.updatePassword(newPassword)
}
