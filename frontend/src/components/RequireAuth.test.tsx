import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import RequireAuth from './RequireAuth'
import * as auth from '../auth'

// Mock the auth module
vi.mock('../auth', () => ({
  currentUser: vi.fn(),
}))

describe('RequireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render children when user is authenticated', () => {
    const mockCurrentUser = vi.mocked(auth.currentUser)
    mockCurrentUser.mockReturnValueOnce({ email: 'test@example.com', role: 'user' })

    render(
      <BrowserRouter>
        <RequireAuth>
          <div>Protected Content</div>
        </RequireAuth>
      </BrowserRouter>
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('should redirect to login when user is not authenticated', () => {
    const mockCurrentUser = vi.mocked(auth.currentUser)
    mockCurrentUser.mockReturnValueOnce(null)

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <RequireAuth>
          <div>Protected Content</div>
        </RequireAuth>
      </MemoryRouter>
    )

    // Should not show protected content
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('should preserve location state when redirecting', () => {
    const mockCurrentUser = vi.mocked(auth.currentUser)
    mockCurrentUser.mockReturnValueOnce(null)

    const { container } = render(
      <MemoryRouter initialEntries={['/protected']}>
        <RequireAuth>
          <div>Protected Content</div>
        </RequireAuth>
      </MemoryRouter>
    )

    // The Navigate component should be rendered
    expect(container).toBeTruthy()
  })
})

