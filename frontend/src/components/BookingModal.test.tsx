import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import BookingModal from './BookingModal'
import { Event } from '../types'
import * as api from '../api'
import * as auth from '../auth'

// Mock the api and auth modules
vi.mock('../api', () => ({
  registerForEvent: vi.fn(),
  getAuthTokenFromStorage: vi.fn(),
}))

vi.mock('../auth', () => ({
  currentUser: vi.fn(),
  logout: vi.fn(),
}))

describe('BookingModal', () => {
  const mockEvent: Event = {
    id: '1',
    title: 'Test Event',
    date: '2024-01-01',
    location: 'Test Location',
    description: 'Test Description',
    price: 25.5,
    ticketsAvailable: 10,
    capacity: 10,
    registrationCount: 5,
  }

  const mockOnBookingSuccess = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <BookingModal
        event={mockEvent}
        isOpen={false}
        onClose={mockOnClose}
        onBookingSuccess={mockOnBookingSuccess}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('should not render when event is null', () => {
    const { container } = render(
      <BookingModal
        event={null}
        isOpen={true}
        onClose={mockOnClose}
        onBookingSuccess={mockOnBookingSuccess}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('should render event details when open', () => {
    const mockCurrentUser = vi.mocked(auth.currentUser)
    mockCurrentUser.mockReturnValueOnce({ email: 'user@example.com', role: 'user' })

    const mockGetAuthToken = vi.mocked(api.getAuthTokenFromStorage)
    mockGetAuthToken.mockReturnValueOnce('valid-token')

    render(
      <BookingModal
        event={mockEvent}
        isOpen={true}
        onClose={mockOnClose}
        onBookingSuccess={mockOnBookingSuccess}
      />
    )

    expect(screen.getByText('Book Event')).toBeInTheDocument()
    expect(screen.getByText('Test Event')).toBeInTheDocument()
    expect(screen.getByText(/2024-01-01/)).toBeInTheDocument()
    expect(screen.getByText(/Test Location/)).toBeInTheDocument()
  })

  it('should display event price', () => {
    const mockCurrentUser = vi.mocked(auth.currentUser)
    mockCurrentUser.mockReturnValueOnce({ email: 'user@example.com', role: 'user' })

    const mockGetAuthToken = vi.mocked(api.getAuthTokenFromStorage)
    mockGetAuthToken.mockReturnValueOnce('valid-token')

    render(
      <BookingModal
        event={mockEvent}
        isOpen={true}
        onClose={mockOnClose}
        onBookingSuccess={mockOnBookingSuccess}
      />
    )

    // Price appears in multiple places, use getAllByText
    expect(screen.getAllByText(/€25.50/).length).toBeGreaterThan(0)
  })

  it('should display registration count and capacity', () => {
    const mockCurrentUser = vi.mocked(auth.currentUser)
    mockCurrentUser.mockReturnValueOnce({ email: 'user@example.com', role: 'user' })

    const mockGetAuthToken = vi.mocked(api.getAuthTokenFromStorage)
    mockGetAuthToken.mockReturnValueOnce('valid-token')

    render(
      <BookingModal
        event={mockEvent}
        isOpen={true}
        onClose={mockOnClose}
        onBookingSuccess={mockOnBookingSuccess}
      />
    )

    expect(screen.getByText(/5 \/ 10 registered/)).toBeInTheDocument()
  })

  it('should allow changing ticket quantity', () => {
    const mockCurrentUser = vi.mocked(auth.currentUser)
    mockCurrentUser.mockReturnValueOnce({ email: 'user@example.com', role: 'user' })

    const mockGetAuthToken = vi.mocked(api.getAuthTokenFromStorage)
    mockGetAuthToken.mockReturnValueOnce('valid-token')

    render(
      <BookingModal
        event={mockEvent}
        isOpen={true}
        onClose={mockOnClose}
        onBookingSuccess={mockOnBookingSuccess}
      />
    )

    const quantityInput = screen.getByDisplayValue('1') as HTMLInputElement
    expect(quantityInput.value).toBe('1')

    fireEvent.change(quantityInput, { target: { value: '3' } })
    expect(quantityInput.value).toBe('3')
  })

  it('should calculate total price correctly', () => {
    const mockCurrentUser = vi.mocked(auth.currentUser)
    mockCurrentUser.mockReturnValueOnce({ email: 'user@example.com', role: 'user' })

    const mockGetAuthToken = vi.mocked(api.getAuthTokenFromStorage)
    mockGetAuthToken.mockReturnValueOnce('valid-token')

    render(
      <BookingModal
        event={mockEvent}
        isOpen={true}
        onClose={mockOnClose}
        onBookingSuccess={mockOnBookingSuccess}
      />
    )

    const quantityInput = screen.getByDisplayValue('1') as HTMLInputElement
    fireEvent.change(quantityInput, { target: { value: '2' } })

    expect(screen.getByText(/€51.00/)).toBeInTheDocument() // 25.50 * 2
  })

  it('should call registerForEvent when booking is confirmed', async () => {
    const mockCurrentUser = vi.mocked(auth.currentUser)
    mockCurrentUser.mockReturnValueOnce({ email: 'user@example.com', role: 'user' })

    const mockGetAuthToken = vi.mocked(api.getAuthTokenFromStorage)
    mockGetAuthToken.mockReturnValueOnce('valid-token')

    const mockRegisterForEvent = vi.mocked(api.registerForEvent)
    mockRegisterForEvent.mockResolvedValueOnce({ ok: true, data: { message: 'Booked' } })

    render(
      <BookingModal
        event={mockEvent}
        isOpen={true}
        onClose={mockOnClose}
        onBookingSuccess={mockOnBookingSuccess}
      />
    )

    const confirmButton = screen.getByText('Confirm Booking')
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockRegisterForEvent).toHaveBeenCalledWith('1', 1)
    }, { timeout: 5000 })
  })

  it('should call onBookingSuccess when booking succeeds', async () => {
    const mockCurrentUser = vi.mocked(auth.currentUser)
    mockCurrentUser.mockReturnValueOnce({ email: 'user@example.com', role: 'user' })

    const mockGetAuthToken = vi.mocked(api.getAuthTokenFromStorage)
    mockGetAuthToken.mockReturnValueOnce('valid-token')

    const mockRegisterForEvent = vi.mocked(api.registerForEvent)
    mockRegisterForEvent.mockResolvedValueOnce({ ok: true, data: { message: 'Booked' } })

    render(
      <BookingModal
        event={mockEvent}
        isOpen={true}
        onClose={mockOnClose}
        onBookingSuccess={mockOnBookingSuccess}
      />
    )

    const confirmButton = screen.getByText('Confirm Booking')
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockOnBookingSuccess).toHaveBeenCalledWith('1', 1)
    }, { timeout: 5000 })
  })

  it('should show success message when booking succeeds', async () => {
    const mockCurrentUser = vi.mocked(auth.currentUser)
    mockCurrentUser.mockReturnValueOnce({ email: 'user@example.com', role: 'user' })

    const mockGetAuthToken = vi.mocked(api.getAuthTokenFromStorage)
    mockGetAuthToken.mockReturnValueOnce('valid-token')

    const mockRegisterForEvent = vi.mocked(api.registerForEvent)
    mockRegisterForEvent.mockResolvedValueOnce({ ok: true, data: { message: 'Booked' } })

    render(
      <BookingModal
        event={mockEvent}
        isOpen={true}
        onClose={mockOnClose}
        onBookingSuccess={mockOnBookingSuccess}
      />
    )

    const confirmButton = screen.getByText('Confirm Booking')
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(screen.getByText('BOOKING CONFIRMED!')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('should display error when booking fails', async () => {
    const mockCurrentUser = vi.mocked(auth.currentUser)
    mockCurrentUser.mockReturnValueOnce({ email: 'user@example.com', role: 'user' })

    const mockGetAuthToken = vi.mocked(api.getAuthTokenFromStorage)
    mockGetAuthToken.mockReturnValueOnce('valid-token')

    const mockRegisterForEvent = vi.mocked(api.registerForEvent)
    mockRegisterForEvent.mockResolvedValueOnce({ ok: false, error: 'Booking failed' })

    render(
      <BookingModal
        event={mockEvent}
        isOpen={true}
        onClose={mockOnClose}
        onBookingSuccess={mockOnBookingSuccess}
      />
    )

    const confirmButton = screen.getByText('Confirm Booking')
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(screen.getByText('Booking failed')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('should call onClose when close button is clicked', () => {
    const mockCurrentUser = vi.mocked(auth.currentUser)
    mockCurrentUser.mockReturnValueOnce({ email: 'user@example.com', role: 'user' })

    const mockGetAuthToken = vi.mocked(api.getAuthTokenFromStorage)
    mockGetAuthToken.mockReturnValueOnce('valid-token')

    render(
      <BookingModal
        event={mockEvent}
        isOpen={true}
        onClose={mockOnClose}
        onBookingSuccess={mockOnBookingSuccess}
      />
    )

    const closeButton = screen.getByText('✕')
    fireEvent.click(closeButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('should disable booking when event is full', () => {
    const mockCurrentUser = vi.mocked(auth.currentUser)
    mockCurrentUser.mockReturnValueOnce({ email: 'user@example.com', role: 'user' })

    const mockGetAuthToken = vi.mocked(api.getAuthTokenFromStorage)
    mockGetAuthToken.mockReturnValueOnce('valid-token')

    const fullEvent: Event = {
      ...mockEvent,
      capacity: 10,
      registrationCount: 10,
    }

    render(
      <BookingModal
        event={fullEvent}
        isOpen={true}
        onClose={mockOnClose}
        onBookingSuccess={mockOnBookingSuccess}
      />
    )

    const confirmButton = screen.getByText('Event Full')
    expect(confirmButton).toBeDisabled()
  })
})

