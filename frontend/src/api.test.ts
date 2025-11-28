import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as api from './api'
import type { BackendEvent } from './api'
import type { Event } from './types'

// Mock fetch globally
window.fetch = vi.fn() as any

describe('API Functions', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('checkBackendHealth', () => {
    it('should return true when backend is reachable', async () => {
      ;(window.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      })

      const result = await api.checkBackendHealth()
      expect(result).toBe(true)
    })

    it('should return true even on error response (server is reachable)', async () => {
      ;(window.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const result = await api.checkBackendHealth()
      expect(result).toBe(true)
    })

    it('should return false on network error', async () => {
      ;(window.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      const result = await api.checkBackendHealth()
      expect(result).toBe(false)
    })
  })

  describe('register', () => {
    it('should successfully register a user', async () => {
      ;(window.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      })

      const result = await api.register('test@example.com', 'password123', 'Test User')
      expect(result.ok).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should handle registration failure', async () => {
      ;(window.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Email already exists' }),
      })

      const result = await api.register('test@example.com', 'password123', 'Test User')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Email already exists')
    })

    it('should handle network errors', async () => {
      ;(window.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      const result = await api.register('test@example.com', 'password123', 'Test User')
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Network error')
    })
  })

  describe('login', () => {
    it('should successfully login and store token', async () => {
      const mockToken = 'mock-jwt-token'
      ;(window.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          token: mockToken,
          role: 'user',
          email: 'test@example.com',
        }),
      })

      const result = await api.login('test@example.com', 'password123')
      expect(result.ok).toBe(true)
      expect(result.token).toBe(mockToken)
      expect(localStorage.getItem('auth_token')).toBe(mockToken)
    })

    it('should handle login failure', async () => {
      ;(window.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Invalid credentials' }),
      })

      const result = await api.login('test@example.com', 'wrongpassword')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Invalid credentials')
    })

    it('should handle missing token in response', async () => {
      ;(window.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ role: 'user' }),
      })

      const result = await api.login('test@example.com', 'password123')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('No token received')
    })
  })

  describe('logout', () => {
    it('should remove auth token from storage', () => {
      localStorage.setItem('auth_token', 'test-token')
      api.logout()
      expect(localStorage.getItem('auth_token')).toBeNull()
    })
  })

  describe('getAuthTokenFromStorage', () => {
    it('should return token from storage', () => {
      localStorage.setItem('auth_token', 'test-token')
      expect(api.getAuthTokenFromStorage()).toBe('test-token')
    })

    it('should return null when no token exists', () => {
      expect(api.getAuthTokenFromStorage()).toBeNull()
    })
  })

  describe('updatePassword', () => {
    it('should successfully update password', async () => {
      localStorage.setItem('auth_token', 'test-token')
      ;(window.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      })

      const result = await api.updatePassword('newpassword123')
      expect(result.ok).toBe(true)
    })

    it('should return error when not authenticated', async () => {
      const result = await api.updatePassword('newpassword123')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Not authenticated')
    })

    it('should handle update failure', async () => {
      localStorage.setItem('auth_token', 'test-token')
      ;(window.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Invalid password' }),
      })

      const result = await api.updatePassword('newpassword123')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Invalid password')
    })
  })

  describe('getUserProfile', () => {
    it('should successfully fetch user profile', async () => {
      localStorage.setItem('auth_token', 'test-token')
      const mockProfile = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        preferredEventTypes: ['Sports', 'Music'],
      }
      ;(window.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockProfile,
      })

      const result = await api.getUserProfile()
      expect(result.ok).toBe(true)
      expect(result.profile).toEqual(mockProfile)
    })

    it('should return error when not authenticated', async () => {
      const result = await api.getUserProfile()
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Not authenticated')
    })
  })

  describe('updateUserProfile', () => {
    it('should successfully update user profile', async () => {
      localStorage.setItem('auth_token', 'test-token')
      ;(window.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      })

      const result = await api.updateUserProfile('New Name', ['Sports'])
      expect(result.ok).toBe(true)
    })

    it('should return error when not authenticated', async () => {
      const result = await api.updateUserProfile('New Name', ['Sports'])
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Not authenticated')
    })
  })

  describe('getEvents', () => {
    it('should successfully fetch events', async () => {
      const mockBackendEvents: BackendEvent[] = [
        {
          ID: 1,
          Name: 'Test Event',
          Description: 'Test Description',
          Location: 'Test Location',
          DateTime: '2024-01-01T12:00:00Z',
          UserID: 1,
          TicketsAvailable: 10,
        },
      ]
      ;(window.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockBackendEvents,
      })

      const result = await api.getEvents()
      expect(result.ok).toBe(true)
      expect(result.events).toBeDefined()
      expect(result.events?.length).toBe(1)
      expect(result.events?.[0].title).toBe('Test Event')
    })

    it('should handle empty response', async () => {
      ;(window.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => null,
      })

      const result = await api.getEvents()
      expect(result.ok).toBe(true)
      expect(result.events).toEqual([])
    })

    it('should handle network errors', async () => {
      ;(window.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      const result = await api.getEvents()
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Network error')
    })
  })

  describe('getEvent', () => {
    it('should successfully fetch a single event', async () => {
      const mockBackendEvent: BackendEvent = {
        ID: 1,
        Name: 'Test Event',
        Description: 'Test Description',
        Location: 'Test Location',
        DateTime: '2024-01-01T12:00:00Z',
        UserID: 1,
        TicketsAvailable: 10,
      }
      ;(window.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockBackendEvent,
      })

      const result = await api.getEvent('1')
      expect(result.ok).toBe(true)
      expect(result.event).toBeDefined()
      expect(result.event?.title).toBe('Test Event')
    })

    it('should handle event not found', async () => {
      ;(window.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Event not found' }),
      })

      const result = await api.getEvent('999')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Event not found')
    })
  })

  describe('createEvent', () => {
    it('should successfully create an event', async () => {
      localStorage.setItem('auth_token', 'test-token')
      const mockEvent: Event = {
        id: '1',
        title: 'New Event',
        date: '2024-01-01',
        location: 'Test Location',
        description: 'Test Description',
        ticketsAvailable: 10,
      }
      const mockBackendEvent: BackendEvent = {
        ID: 1,
        Name: 'New Event',
        Description: 'Test Description',
        Location: 'Test Location',
        DateTime: '2024-01-01T12:00:00Z',
        UserID: 1,
        TicketsAvailable: 10,
      }
      ;(window.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ event: mockBackendEvent }),
        })

      const result = await api.createEvent(mockEvent)
      expect(result.ok).toBe(true)
      expect(result.event).toBeDefined()
    })

    it('should return error when not authenticated', async () => {
      const mockEvent: Event = {
        id: '1',
        title: 'New Event',
        date: '2024-01-01',
        ticketsAvailable: 10,
      }

      const result = await api.createEvent(mockEvent)
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Not authenticated')
    })
  })

  describe('updateEvent', () => {
    it('should successfully update an event', async () => {
      localStorage.setItem('auth_token', 'test-token')
      const mockEvent: Event = {
        id: '1',
        title: 'Updated Event',
        date: '2024-01-01',
        location: 'Updated Location',
        description: 'Updated Description',
        ticketsAvailable: 10,
      }
      ;(window.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      })

      const result = await api.updateEvent('1', mockEvent)
      expect(result.ok).toBe(true)
    })

    it('should return error when not authenticated', async () => {
      const mockEvent: Event = {
        id: '1',
        title: 'Updated Event',
        date: '2024-01-01',
        ticketsAvailable: 10,
      }

      const result = await api.updateEvent('1', mockEvent)
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Not authenticated')
    })
  })

  describe('deleteEvent', () => {
    it('should successfully delete an event', async () => {
      localStorage.setItem('auth_token', 'test-token')
      ;(window.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      })

      const result = await api.deleteEvent('1')
      expect(result.ok).toBe(true)
    })

    it('should return error when not authenticated', async () => {
      const result = await api.deleteEvent('1')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Not authenticated')
    })
  })

  describe('registerForEvent', () => {
    it('should successfully register for an event', async () => {
      localStorage.setItem('auth_token', 'test-token')
      ;(window.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          message: 'Successfully registered',
          eventId: '1',
          userId: '1',
          quantity: 1,
        }),
      })

      const result = await api.registerForEvent('1', 1)
      expect(result.ok).toBe(true)
      expect(result.data).toBeDefined()
    })

    it('should return error when not authenticated', async () => {
      const result = await api.registerForEvent('1', 1)
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Authentication required')
    })
  })

  describe('unregisterFromEvent', () => {
    it('should successfully unregister from an event', async () => {
      localStorage.setItem('auth_token', 'test-token')
      ;(window.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          message: 'Successfully unregistered',
          eventId: '1',
          userId: '1',
        }),
      })

      const result = await api.unregisterFromEvent('1')
      expect(result.ok).toBe(true)
      expect(result.data).toBeDefined()
    })

    it('should return error when not authenticated', async () => {
      const result = await api.unregisterFromEvent('1')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Authentication required')
    })
  })

  describe('checkEventRegistration', () => {
    it('should successfully check registration status', async () => {
      localStorage.setItem('auth_token', 'test-token')
      ;(window.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ isRegistered: true }),
      })

      const result = await api.checkEventRegistration('1')
      expect(result.ok).toBe(true)
      expect(result.data?.isRegistered).toBe(true)
    })

    it('should return error when not authenticated', async () => {
      const result = await api.checkEventRegistration('1')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Authentication required')
    })
  })

  describe('getEventRegistrationCount', () => {
    it('should successfully get registration count', async () => {
      ;(window.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ count: 5, capacity: 10 }),
      })

      const result = await api.getEventRegistrationCount('1')
      expect(result.ok).toBe(true)
      expect(result.data?.count).toBe(5)
      expect(result.data?.capacity).toBe(10)
    })

    it('should handle network errors', async () => {
      ;(window.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      const result = await api.getEventRegistrationCount('1')
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Network error')
    })
  })
})

