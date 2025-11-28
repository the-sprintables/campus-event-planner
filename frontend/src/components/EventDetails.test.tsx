import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import EventDetails from './EventDetails'
import { Event } from '../types'
import * as api from '../api'
import * as auth from '../auth'

// Mock the api and auth modules
vi.mock('../api', () => ({
  registerForEvent: vi.fn(),
  unregisterFromEvent: vi.fn(),
}))

vi.mock('../auth', () => ({
  currentUser: vi.fn(),
}))

describe('EventDetails', () => {
  const mockEvent: Event = {
    id: '1',
    title: 'Test Event',
    date: '2024-01-01',
    location: 'Test Location',
    description: 'Test Description',
    ticketsAvailable: 10,
    capacity: 10,
    registrationCount: 5,
    isRegistered: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not render when event is null', () => {
    const { container } = render(<EventDetails event={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('should render event details', () => {
    render(<EventDetails event={mockEvent} />)

    expect(screen.getByText('Test Event')).toBeInTheDocument()
    expect(screen.getByText('Test Description')).toBeInTheDocument()
    expect(screen.getByText(/2024-01-01/)).toBeInTheDocument()
    expect(screen.getByText(/Test Location/)).toBeInTheDocument()
  })

  it('should display event image when available', () => {
    const eventWithImage: Event = {
      ...mockEvent,
      imageData: 'data:image/png;base64,mock-image',
    }

    render(<EventDetails event={eventWithImage} />)

    const image = screen.getByAltText('Test Event')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', 'data:image/png;base64,mock-image')
  })

  it('should display color fallback when no image', () => {
    const eventWithColor: Event = {
      ...mockEvent,
      color: '#ff0000',
    }

    const { container } = render(<EventDetails event={eventWithColor} />)
    const colorDiv = container.querySelector('div[style*="background"]')
    expect(colorDiv).toBeInTheDocument()
  })

  it('should display event types when available', () => {
    const eventWithTypes: Event = {
      ...mockEvent,
      eventType: ['Sports', 'Music'],
    }

    render(<EventDetails event={eventWithTypes} />)

    expect(screen.getByText('Sports')).toBeInTheDocument()
    expect(screen.getByText('Music')).toBeInTheDocument()
  })

  it('should display registration count and capacity', () => {
    render(<EventDetails event={mockEvent} />)

    expect(screen.getByText(/5 \/ 10 registered/)).toBeInTheDocument()
  })

  it('should show register button for regular users', () => {
    const mockCurrentUser = vi.mocked(auth.currentUser)
    mockCurrentUser.mockReturnValueOnce({ email: 'user@example.com', role: 'user' })

    render(<EventDetails event={mockEvent} />)

    expect(screen.getByText('Book Event')).toBeInTheDocument()
  })

  it('should not show register button for admins', () => {
    const mockCurrentUser = vi.mocked(auth.currentUser)
    mockCurrentUser.mockReturnValueOnce({ email: 'admin@example.com', role: 'admin' })

    render(<EventDetails event={mockEvent} />)

    expect(screen.queryByText('Book Event')).not.toBeInTheDocument()
  })

  it('should show login prompt for unauthenticated users', () => {
    const mockCurrentUser = vi.mocked(auth.currentUser)
    mockCurrentUser.mockReturnValueOnce(null)

    render(<EventDetails event={mockEvent} />)

    expect(screen.getByText(/Please/)).toBeInTheDocument()
    expect(screen.getByText(/login/)).toBeInTheDocument()
  })

  it('should call registerForEvent when register button is clicked', async () => {
    const mockCurrentUser = vi.mocked(auth.currentUser)
    mockCurrentUser.mockReturnValueOnce({ email: 'user@example.com', role: 'user' })

    const mockRegisterForEvent = vi.mocked(api.registerForEvent)
    mockRegisterForEvent.mockResolvedValueOnce({ ok: true, data: { message: 'Registered' } })

    render(<EventDetails event={mockEvent} />)

    const registerButton = screen.getByText('Book Event')
    fireEvent.click(registerButton)

    await waitFor(() => {
      expect(mockRegisterForEvent).toHaveBeenCalledWith('1')
    })
  })

  it('should call unregisterFromEvent when cancel booking is clicked', async () => {
    const mockCurrentUser = vi.mocked(auth.currentUser)
    mockCurrentUser.mockReturnValueOnce({ email: 'user@example.com', role: 'user' })

    const mockUnregisterFromEvent = vi.mocked(api.unregisterFromEvent)
    mockUnregisterFromEvent.mockResolvedValueOnce({ ok: true, data: { message: 'Unregistered' } })

    const registeredEvent: Event = {
      ...mockEvent,
      isRegistered: true,
    }

    render(<EventDetails event={registeredEvent} />)

    const cancelButton = screen.getByText('Cancel Booking')
    fireEvent.click(cancelButton)

    await waitFor(() => {
      expect(mockUnregisterFromEvent).toHaveBeenCalledWith('1')
    })
  })

  it('should call onRegistrationChange when registration succeeds', async () => {
    const mockCurrentUser = vi.mocked(auth.currentUser)
    mockCurrentUser.mockReturnValueOnce({ email: 'user@example.com', role: 'user' })

    const mockRegisterForEvent = vi.mocked(api.registerForEvent)
    mockRegisterForEvent.mockResolvedValueOnce({ ok: true, data: { message: 'Registered' } })

    const mockOnRegistrationChange = vi.fn()

    render(<EventDetails event={mockEvent} onRegistrationChange={mockOnRegistrationChange} />)

    const registerButton = screen.getByText('Book Event')
    fireEvent.click(registerButton)

    await waitFor(() => {
      expect(mockOnRegistrationChange).toHaveBeenCalledWith('1', true)
    })
  })

  it('should disable register button when event is full', () => {
    const mockCurrentUser = vi.mocked(auth.currentUser)
    mockCurrentUser.mockReturnValueOnce({ email: 'user@example.com', role: 'user' })

    const fullEvent: Event = {
      ...mockEvent,
      capacity: 10,
      registrationCount: 10,
    }

    render(<EventDetails event={fullEvent} />)

    const registerButton = screen.getByText('Event Full')
    expect(registerButton).toBeDisabled()
  })

  it('should show registered status when user is registered', () => {
    const mockCurrentUser = vi.mocked(auth.currentUser)
    mockCurrentUser.mockReturnValueOnce({ email: 'user@example.com', role: 'user' })

    const registeredEvent: Event = {
      ...mockEvent,
      isRegistered: true,
    }

    render(<EventDetails event={registeredEvent} />)

    expect(screen.getByText('✓ You are registered')).toBeInTheDocument()
  })
})

