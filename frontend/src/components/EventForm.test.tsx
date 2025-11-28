import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EventForm from './EventForm'
import { Event } from '../types'

// Mock FileReader
const MockFileReader = class extends EventTarget {
  result: string | null = null
  readyState: 0 | 1 | 2 = 0
  error: DOMException | null = null
  onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null = null
  onloadstart: ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null = null
  onloadend: ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null = null
  onprogress: ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null = null
  onabort: ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null = null
  onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null = null

  readAsDataURL(file: Blob) {
    setTimeout(() => {
      this.result = 'data:image/png;base64,mock-image-data'
      if (this.onload) {
        this.onload.call(this as any, {} as ProgressEvent<FileReader>)
      }
    }, 0)
  }

  readAsText(file: Blob, encoding?: string): void {
    // Mock implementation
  }
  readAsArrayBuffer(file: Blob): void {
    // Mock implementation
  }
  readAsBinaryString(file: Blob): void {
    // Mock implementation
  }
  abort(): void {
    // Mock implementation
  }
} as any

// Add static constants
;(MockFileReader as any).EMPTY = 0
;(MockFileReader as any).LOADING = 1
;(MockFileReader as any).DONE = 2

window.FileReader = MockFileReader as any

describe('EventForm', () => {
  const mockOnCreate = vi.fn()
  const mockOnUpdate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render form fields', () => {
    render(<EventForm onCreate={mockOnCreate} />)

    expect(screen.getByPlaceholderText('Event Title')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Event Location')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Event Description')).toBeInTheDocument()
  })

  it('should call onCreate when form is submitted with valid data', async () => {
    const user = userEvent.setup()
    render(<EventForm onCreate={mockOnCreate} />)

    await user.type(screen.getByPlaceholderText('Event Title'), 'Test Event')
    await user.type(screen.getByPlaceholderText('Event Location'), 'Test Location')
    await user.type(screen.getByPlaceholderText('Event Description'), 'Test Description')
    
    // Find date input by type
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement
    expect(dateInput).toBeInTheDocument()
    await user.type(dateInput, '2024-12-31')

    const submitButton = screen.getByText('Create Event')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnCreate).toHaveBeenCalledTimes(1)
    }, { timeout: 3000 })

    const createdEvent = mockOnCreate.mock.calls[0][0]
    expect(createdEvent.title).toBe('Test Event')
    expect(createdEvent.location).toBe('Test Location')
    expect(createdEvent.description).toBe('Test Description')
    expect(createdEvent.date).toBe('2024-12-31')
  })

  it('should not submit form when title is empty', async () => {
    const user = userEvent.setup()
    render(<EventForm onCreate={mockOnCreate} />)

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement
    await user.type(dateInput, '2024-12-31')

    const submitButton = screen.getByText('Create Event')
    await user.click(submitButton)

    // Wait a bit to ensure the form doesn't submit
    await waitFor(() => {
      expect(mockOnCreate).not.toHaveBeenCalled()
    }, { timeout: 1000 })
  })

  it('should not submit form when date is empty', async () => {
    const user = userEvent.setup()
    render(<EventForm onCreate={mockOnCreate} />)

    await user.type(screen.getByPlaceholderText('Event Title'), 'Test Event')

    const submitButton = screen.getByText('Create Event')
    await user.click(submitButton)

    expect(mockOnCreate).not.toHaveBeenCalled()
  })

  it('should populate form when editingEvent is provided', () => {
    const editingEvent: Event = {
      id: '1',
      title: 'Existing Event',
      date: '2024-01-01',
      location: 'Existing Location',
      description: 'Existing Description',
      price: 10.5,
      ticketsAvailable: 50,
      priority: 'available',
    }

    render(<EventForm onUpdate={mockOnUpdate} editingEvent={editingEvent} />)

    const titleInput = screen.getByPlaceholderText('Event Title') as HTMLInputElement
    expect(titleInput.value).toBe('Existing Event')

    const locationInput = screen.getByPlaceholderText('Event Location') as HTMLInputElement
    expect(locationInput.value).toBe('Existing Location')
  })

  it('should call onUpdate when editing and form is submitted', async () => {
    const user = userEvent.setup()
    const editingEvent: Event = {
      id: '1',
      title: 'Existing Event',
      date: '2024-01-01',
      ticketsAvailable: 50,
    }

    render(<EventForm onUpdate={mockOnUpdate} editingEvent={editingEvent} />)

    const titleInput = screen.getByPlaceholderText('Event Title')
    await user.clear(titleInput)
    await user.type(titleInput, 'Updated Event')

    const submitButton = screen.getByText('Save Changes')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledTimes(1)
    })

    const updatedEvent = mockOnUpdate.mock.calls[0][0]
    expect(updatedEvent.title).toBe('Updated Event')
    expect(updatedEvent.id).toBe('1')
  })

  it('should handle image upload', async () => {
    const user = userEvent.setup()
    render(<EventForm onCreate={mockOnCreate} />)

    const file = new File(['test'], 'test.png', { type: 'image/png' })
    // Find file input directly by type
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toBeInTheDocument()

    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(screen.getByAltText('Event preview')).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('should handle event type selection', async () => {
    const user = userEvent.setup()
    render(<EventForm onCreate={mockOnCreate} />)

    const sportsCheckbox = screen.getByText('Sports & Fitness').closest('label')?.querySelector('input[type="checkbox"]') as HTMLInputElement
    await user.click(sportsCheckbox)

    expect(sportsCheckbox.checked).toBe(true)
  })

  it('should limit event type selection to 2', async () => {
    const user = userEvent.setup()
    render(<EventForm onCreate={mockOnCreate} />)

    const sportsCheckbox = screen.getByText('Sports & Fitness').closest('label')?.querySelector('input[type="checkbox"]') as HTMLInputElement
    const musicCheckbox = screen.getByText('Music & Entertainment').closest('label')?.querySelector('input[type="checkbox"]') as HTMLInputElement
    const partiesCheckbox = screen.getByText('Parties & Social').closest('label')?.querySelector('input[type="checkbox"]') as HTMLInputElement

    await user.click(sportsCheckbox)
    await user.click(musicCheckbox)
    await user.click(partiesCheckbox)

    expect(sportsCheckbox.checked).toBe(true)
    expect(musicCheckbox.checked).toBe(true)
    expect(partiesCheckbox.checked).toBe(false) // Should be disabled
  })

  it('should handle price input', async () => {
    const user = userEvent.setup()
    render(<EventForm onCreate={mockOnCreate} />)

    const priceInput = screen.getByPlaceholderText('0.00') as HTMLInputElement
    await user.type(priceInput, '25.50')

    // Number inputs may normalize the value, so check it contains the number
    expect(priceInput.value).toContain('25.5')
  })

  it('should show cancel button when editing', () => {
    const editingEvent: Event = {
      id: '1',
      title: 'Test Event',
      date: '2024-01-01',
      ticketsAvailable: 50,
    }

    render(<EventForm onUpdate={mockOnUpdate} editingEvent={editingEvent} />)

    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('should call onUpdate with original event when cancel is clicked', async () => {
    const user = userEvent.setup()
    const editingEvent: Event = {
      id: '1',
      title: 'Original Event',
      date: '2024-01-01',
      ticketsAvailable: 50,
    }

    render(<EventForm onUpdate={mockOnUpdate} editingEvent={editingEvent} />)

    const cancelButton = screen.getByText('Cancel')
    await user.click(cancelButton)

    expect(mockOnUpdate).toHaveBeenCalledWith(editingEvent)
  })
})

