// Auth helpers that use the backend API

import * as api from './api'

type User = {
  email: string
  userId?: number
  role?: 'admin' | 'user'
}

const SESSION_KEY = 'app_session'
const TOKEN_KEY = 'auth_token'

// Decode JWT token to get user info (simple base64 decode)
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

export function register(email: string, password: string) {
  return api.register(email, password)
}

export function login(email: string, password: string, role?: 'admin' | 'user') {
  return api.login(email, password).then(result => {
    if (result.ok && result.token) {
      // Decode token to get user info
      const userInfo = decodeJWT(result.token)
      if (userInfo) {
        // Store user session info - use role from backend response
        const user: User = {
          email: result.email || userInfo.email || email,
          userId: userInfo.userId,
          role: (result.role as 'admin' | 'user') || role || 'user' // Use role from backend, fallback to selected role
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
    // Verify token still exists
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
