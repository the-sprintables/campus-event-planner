import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import Login from './Login'
import * as auth from '../auth'

// Mock the auth module and useNavigate
vi.mock('../auth', () => ({
  login: vi.fn(),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('Login', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('should render login form', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )

    expect(screen.getByText('Please Login!')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument()
  })

  it('should update email input', async () => {
    const user = userEvent.setup()
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )

    const emailInput = screen.getByPlaceholderText('Enter your email') as HTMLInputElement
    await user.type(emailInput, 'test@example.com')

    expect(emailInput.value).toBe('test@example.com')
  })

  it('should update password input', async () => {
    const user = userEvent.setup()
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )

    const passwordInput = screen.getByPlaceholderText('Enter your password') as HTMLInputElement
    await user.type(passwordInput, 'password123')

    expect(passwordInput.value).toBe('password123')
  })

  it('should allow selecting user role', async () => {
    const user = userEvent.setup()
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )

    const userButton = screen.getByText('User')
    await user.click(userButton)

    expect(userButton).toHaveClass('btn')
  })

  it('should allow selecting admin role', async () => {
    const user = userEvent.setup()
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )

    const adminButton = screen.getByText('Admin')
    await user.click(adminButton)

    expect(adminButton).toHaveClass('btn')
  })

  it('should show error when fields are empty', async () => {
    const user = userEvent.setup()
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )

    const submitButton = screen.getByText('Login')
    await user.click(submitButton)

    expect(screen.getByText('Please fill all fields and select a role')).toBeInTheDocument()
  })

  it('should call login function on form submit', async () => {
    const user = userEvent.setup()
    const mockLogin = vi.mocked(auth.login)
    mockLogin.mockResolvedValueOnce({ ok: true, token: 'mock-token', role: 'user', email: 'test@example.com' })

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )

    await user.type(screen.getByPlaceholderText('Enter your email'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('Enter your password'), 'password123')
    await user.click(screen.getByText('User'))
    await user.click(screen.getByText('Login'))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123', 'user')
    })
  })

  it('should navigate to home on successful login', async () => {
    const user = userEvent.setup()
    const mockLogin = vi.mocked(auth.login)
    mockLogin.mockResolvedValueOnce({ ok: true, token: 'mock-token', role: 'user', email: 'test@example.com' })

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )

    await user.type(screen.getByPlaceholderText('Enter your email'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('Enter your password'), 'password123')
    await user.click(screen.getByText('User'))
    await user.click(screen.getByText('Login'))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  it('should navigate to feed for new users', async () => {
    const user = userEvent.setup()
    localStorage.setItem('is_new_user_test@example.com', 'true')
    const mockLogin = vi.mocked(auth.login)
    mockLogin.mockResolvedValueOnce({ ok: true, token: 'mock-token', role: 'user', email: 'test@example.com' })

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )

    await user.type(screen.getByPlaceholderText('Enter your email'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('Enter your password'), 'password123')
    await user.click(screen.getByText('User'))
    await user.click(screen.getByText('Login'))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/feed')
      expect(localStorage.getItem('is_new_user_test@example.com')).toBeNull()
    })
  })

  it('should display error message on login failure', async () => {
    const user = userEvent.setup()
    const mockLogin = vi.mocked(auth.login)
    mockLogin.mockResolvedValueOnce({ ok: false, error: 'Invalid credentials' })

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )

    await user.type(screen.getByPlaceholderText('Enter your email'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('Enter your password'), 'wrongpassword')
    await user.click(screen.getByText('User'))
    await user.click(screen.getByText('Login'))

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })
  })

  it('should show link to register page', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )

    const registerLink = screen.getByText('Register')
    expect(registerLink).toBeInTheDocument()
    expect(registerLink.closest('a')).toHaveAttribute('href', '/register')
  })
})

