import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ConfirmDialog from './ConfirmDialog'

describe('ConfirmDialog', () => {
  it('should not render when open is false', () => {
    const { container } = render(
      <ConfirmDialog
        open={false}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('should render when open is true', () => {
    const { container } = render(
      <ConfirmDialog
        open={true}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    )

    expect(container.firstChild).not.toBeNull()
    // Check for title (h3) and message separately
    expect(screen.getByRole('heading', { name: 'Confirm' })).toBeInTheDocument()
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
    // Check that buttons exist
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
  })

  it('should use custom title and message', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Delete Event"
        message="This action cannot be undone"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    )

    expect(screen.getByText('Delete Event')).toBeInTheDocument()
    expect(screen.getByText('This action cannot be undone')).toBeInTheDocument()
  })

  it('should call onCancel when cancel button is clicked', () => {
    const handleCancel = vi.fn()
    render(
      <ConfirmDialog
        open={true}
        onCancel={handleCancel}
        onConfirm={vi.fn()}
      />
    )

    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    expect(handleCancel).toHaveBeenCalledTimes(1)
  })

  it('should call onConfirm when confirm button is clicked', () => {
    const handleConfirm = vi.fn()
    const handleCancel = vi.fn()
    render(
      <ConfirmDialog
        open={true}
        onCancel={handleCancel}
        onConfirm={handleConfirm}
      />
    )

    // Use getByRole to specifically target the button, not the heading
    const confirmButton = screen.getByRole('button', { name: 'Confirm' })
    expect(confirmButton).toBeInTheDocument()
    fireEvent.click(confirmButton)

    expect(handleConfirm).toHaveBeenCalledTimes(1)
    expect(handleCancel).not.toHaveBeenCalled()
  })

  it('should use custom button text', () => {
    render(
      <ConfirmDialog
        open={true}
        cancelText="No"
        confirmText="Yes"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    )

    expect(screen.getByText('No')).toBeInTheDocument()
    expect(screen.getByText('Yes')).toBeInTheDocument()
  })
})

