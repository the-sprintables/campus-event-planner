import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as auth from './auth'
import * as api from './api'

// Mock the api module
vi.mock('./api', () => ({
  register: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  getAuthTokenFromStorage: vi.fn(),
  updatePassword: vi.fn(),
}))

describe('Auth Functions', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('register', () => {
    it('should call api.register with correct parameters', async () => {
      const mockRegister = vi.mocked(api.register)
      mockRegister.mockResolvedValueOnce({ ok: true })

      await auth.register('test@example.com', 'password123', 'Test User')

      expect(mockRegister).toHaveBeenCalledWith('test@example.com', 'password123', 'Test User')
    })

    it('should return the result from api.register', async () => {
      const mockRegister = vi.mocked(api.register)
      const mockResult = { ok: true }
      mockRegister.mockResolvedValueOnce(mockResult)

      const result = await auth.register('test@example.com', 'password123', 'Test User')

      expect(result).toEqual(mockResult)
    })
  })

  describe('login', () => {
    it('should store user session on successful login', async () => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSJ9.signature'
      const mockLogin = vi.mocked(api.login)
      mockLogin.mockResolvedValueOnce({
        ok: true,
        token: mockToken,
        role: 'user',
        email: 'test@example.com',
      })

      await auth.login('test@example.com', 'password123')

      const session = localStorage.getItem('app_session')
      expect(session).toBeTruthy()
      if (session) {
        const user = JSON.parse(session)
        expect(user.email).toBe('test@example.com')
        expect(user.role).toBe('user')
      }
    })

    it('should decode JWT token to get userId', async () => {
      // Create a valid JWT token with userId
      const payload = btoa(JSON.stringify({ userId: 123, email: 'test@example.com' }))
      const mockToken = `header.${payload}.signature`
      const mockLogin = vi.mocked(api.login)
      mockLogin.mockResolvedValueOnce({
        ok: true,
        token: mockToken,
        role: 'user',
        email: 'test@example.com',
      })

      await auth.login('test@example.com', 'password123')

      const session = localStorage.getItem('app_session')
      if (session) {
        const user = JSON.parse(session)
        expect(user.userId).toBe(123)
      }
    })

    it('should use role from API response', async () => {
      const mockToken = 'mock-token'
      const mockLogin = vi.mocked(api.login)
      mockLogin.mockResolvedValueOnce({
        ok: true,
        token: mockToken,
        role: 'admin',
        email: 'admin@example.com',
      })

      await auth.login('admin@example.com', 'password123')

      const session = localStorage.getItem('app_session')
      if (session) {
        const user = JSON.parse(session)
        expect(user.role).toBe('admin')
      }
    })

    it('should not store session on failed login', async () => {
      const mockLogin = vi.mocked(api.login)
      mockLogin.mockResolvedValueOnce({
        ok: false,
        error: 'Invalid credentials',
      })

      await auth.login('test@example.com', 'wrongpassword')

      const session = localStorage.getItem('app_session')
      expect(session).toBeNull()
    })
  })

  describe('logout', () => {
    it('should remove session from localStorage', () => {
      localStorage.setItem('app_session', JSON.stringify({ email: 'test@example.com' }))
      const mockLogout = vi.mocked(api.logout)

      auth.logout()

      expect(mockLogout).toHaveBeenCalled()
      expect(localStorage.getItem('app_session')).toBeNull()
    })
  })

  describe('currentUser', () => {
    it('should return user from localStorage when token exists', () => {
      const mockUser = { email: 'test@example.com', userId: 1, role: 'user' as const }
      localStorage.setItem('app_session', JSON.stringify(mockUser))
      const mockGetAuthToken = vi.mocked(api.getAuthTokenFromStorage)
      mockGetAuthToken.mockReturnValueOnce('valid-token')

      const user = auth.currentUser()

      expect(user).toEqual(mockUser)
    })

    it('should return null when no session exists', () => {
      const user = auth.currentUser()
      expect(user).toBeNull()
    })

    it('should return null when token is missing', () => {
      const mockUser = { email: 'test@example.com', userId: 1, role: 'user' as const }
      localStorage.setItem('app_session', JSON.stringify(mockUser))
      const mockGetAuthToken = vi.mocked(api.getAuthTokenFromStorage)
      mockGetAuthToken.mockReturnValueOnce(null)

      const user = auth.currentUser()

      expect(user).toBeNull()
      expect(localStorage.getItem('app_session')).toBeNull()
    })

    it('should handle invalid JSON in session', () => {
      localStorage.setItem('app_session', 'invalid-json')
      const mockGetAuthToken = vi.mocked(api.getAuthTokenFromStorage)
      mockGetAuthToken.mockReturnValueOnce('valid-token')

      const user = auth.currentUser()

      expect(user).toBeNull()
    })
  })

  describe('updatePassword', () => {
    it('should call api.updatePassword with correct parameters', async () => {
      const mockUpdatePassword = vi.mocked(api.updatePassword)
      mockUpdatePassword.mockResolvedValueOnce({ ok: true })

      await auth.updatePassword('test@example.com', 'newpassword123')

      expect(mockUpdatePassword).toHaveBeenCalledWith('newpassword123')
    })

    it('should return the result from api.updatePassword', async () => {
      const mockUpdatePassword = vi.mocked(api.updatePassword)
      const mockResult = { ok: true }
      mockUpdatePassword.mockResolvedValueOnce(mockResult)

      const result = await auth.updatePassword('test@example.com', 'newpassword123')

      expect(result).toEqual(mockResult)
    })
  })
})

