import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import EventList from './EventList'
import { Event } from '../types'

describe('EventList', () => {
  const mockEvents: Event[] = [
    {
      id: '1',
      title: 'Test Event 1',
      date: '2024-01-01',
      location: 'Location 1',
      description: 'Description 1',
      ticketsAvailable: 10,
      priority: 'available',
    },
    {
      id: '2',
      title: 'Test Event 2',
      date: '2024-01-02',
      location: 'Location 2',
      ticketsAvailable: 20,
      priority: 'almost-full',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render empty state when no events', () => {
    render(<EventList events={[]} />)

    expect(screen.getByText('No events yet')).toBeInTheDocument()
    expect(screen.getByText('Create your first event to get started!')).toBeInTheDocument()
  })

  it('should render list of events', () => {
    render(<EventList events={mockEvents} />)

    expect(screen.getByText('Test Event 1')).toBeInTheDocument()
    expect(screen.getByText('Test Event 2')).toBeInTheDocument()
    expect(screen.getByText('2024-01-01')).toBeInTheDocument()
    expect(screen.getByText('2024-01-02')).toBeInTheDocument()
  })

  it('should display event locations when available', () => {
    render(<EventList events={mockEvents} />)

    expect(screen.getByText('Location 1')).toBeInTheDocument()
    expect(screen.getByText('Location 2')).toBeInTheDocument()
  })

  it('should display priority badges', () => {
    render(<EventList events={mockEvents} />)

    expect(screen.getByText('Available')).toBeInTheDocument()
    expect(screen.getByText('Almost Full')).toBeInTheDocument()
  })

  it('should call onSelect when edit button is clicked', () => {
    const mockOnSelect = vi.fn()
    render(<EventList events={mockEvents} onSelect={mockOnSelect} />)

    const editButtons = screen.getAllByText('Edit')
    fireEvent.click(editButtons[0])

    expect(mockOnSelect).toHaveBeenCalledTimes(1)
    expect(mockOnSelect).toHaveBeenCalledWith(mockEvents[0])
  })

  it('should show delete button when onDelete is provided', () => {
    const mockOnDelete = vi.fn()
    render(<EventList events={mockEvents} onDelete={mockOnDelete} />)

    expect(screen.getAllByText('Delete').length).toBe(2)
  })

  it('should not show delete button when onDelete is not provided', () => {
    render(<EventList events={mockEvents} />)

    expect(screen.queryByText('Delete')).not.toBeInTheDocument()
  })

  it('should show confirmation dialog when delete is clicked', () => {
    const mockOnDelete = vi.fn()
    render(<EventList events={mockEvents} onDelete={mockOnDelete} />)

    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    expect(screen.getByText('Delete event')).toBeInTheDocument()
    expect(screen.getByText('This action cannot be undone. Delete this event?')).toBeInTheDocument()
  })

  it('should call onDelete when delete is confirmed', () => {
    const mockOnDelete = vi.fn()
    render(<EventList events={mockEvents} onDelete={mockOnDelete} />)

    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    const confirmButton = screen.getByText('Confirm')
    fireEvent.click(confirmButton)

    expect(mockOnDelete).toHaveBeenCalledTimes(1)
    expect(mockOnDelete).toHaveBeenCalledWith('1')
  })

  it('should not call onDelete when delete is cancelled', () => {
    const mockOnDelete = vi.fn()
    render(<EventList events={mockEvents} onDelete={mockOnDelete} />)

    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    expect(mockOnDelete).not.toHaveBeenCalled()
  })

  it('should handle events without location', () => {
    const eventsWithoutLocation: Event[] = [
      {
        id: '1',
        title: 'Test Event',
        date: '2024-01-01',
        ticketsAvailable: 10,
      },
    ]

    render(<EventList events={eventsWithoutLocation} />)

    expect(screen.getByText('Test Event')).toBeInTheDocument()
    expect(screen.queryByText('Location')).not.toBeInTheDocument()
  })

  it('should handle events without priority', () => {
    const eventsWithoutPriority: Event[] = [
      {
        id: '1',
        title: 'Test Event',
        date: '2024-01-01',
        ticketsAvailable: 10,
      },
    ]

    render(<EventList events={eventsWithoutPriority} />)

    expect(screen.getByText('Test Event')).toBeInTheDocument()
  })
})

