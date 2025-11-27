import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import RequireAdmin from './RequireAdmin'
import * as auth from '../auth'

// Mock the auth module
vi.mock('../auth', () => ({
  currentUser: vi.fn(),
}))

describe('RequireAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render children when user is admin', () => {
    const mockCurrentUser = vi.mocked(auth.currentUser)
    mockCurrentUser.mockReturnValueOnce({ email: 'admin@example.com', role: 'admin' })

    render(
      <BrowserRouter>
        <RequireAdmin>
          <div>Admin Content</div>
        </RequireAdmin>
      </BrowserRouter>
    )

    expect(screen.getByText('Admin Content')).toBeInTheDocument()
  })

  it('should redirect to login when user is not authenticated', () => {
    const mockCurrentUser = vi.mocked(auth.currentUser)
    mockCurrentUser.mockReturnValueOnce(null)

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <RequireAdmin>
          <div>Admin Content</div>
        </RequireAdmin>
      </MemoryRouter>
    )

    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })

  it('should redirect to login when user is not admin', () => {
    const mockCurrentUser = vi.mocked(auth.currentUser)
    mockCurrentUser.mockReturnValueOnce({ email: 'user@example.com', role: 'user' })

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <RequireAdmin>
          <div>Admin Content</div>
        </RequireAdmin>
      </MemoryRouter>
    )

    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })
})

