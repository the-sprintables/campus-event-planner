import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import Register from './Register'
import * as auth from '../auth'

// Mock the auth module and useNavigate
vi.mock('../auth', () => ({
  register: vi.fn(),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('Register', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('should render registration form', () => {
    render(
      <BrowserRouter>
        <Register />
      </BrowserRouter>
    )

    expect(screen.getByText('Please Register!')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument()
  })

  it('should update name input', async () => {
    const user = userEvent.setup()
    render(
      <BrowserRouter>
        <Register />
      </BrowserRouter>
    )

    const nameInput = screen.getByPlaceholderText('Enter your name') as HTMLInputElement
    await user.type(nameInput, 'Test User')

    expect(nameInput.value).toBe('Test User')
  })

  it('should update email input', async () => {
    const user = userEvent.setup()
    render(
      <BrowserRouter>
        <Register />
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
        <Register />
      </BrowserRouter>
    )

    const passwordInput = screen.getByPlaceholderText('Enter your password') as HTMLInputElement
    await user.type(passwordInput, 'password123')

    expect(passwordInput.value).toBe('password123')
  })

  it('should show error when fields are empty', async () => {
    const user = userEvent.setup()
    render(
      <BrowserRouter>
        <Register />
      </BrowserRouter>
    )

    const submitButton = screen.getByText('Register')
    await user.click(submitButton)

    expect(screen.getByText('Please fill all fields')).toBeInTheDocument()
  })

  it('should call register function on form submit', async () => {
    const user = userEvent.setup()
    const mockRegister = vi.mocked(auth.register)
    mockRegister.mockResolvedValueOnce({ ok: true })

    render(
      <BrowserRouter>
        <Register />
      </BrowserRouter>
    )

    await user.type(screen.getByPlaceholderText('Enter your name'), 'Test User')
    await user.type(screen.getByPlaceholderText('Enter your email'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('Enter your password'), 'password123')
    await user.click(screen.getByText('Register'))

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('test@example.com', 'password123', 'Test User')
    })
  })

  it('should navigate to login on successful registration', async () => {
    const user = userEvent.setup()
    const mockRegister = vi.mocked(auth.register)
    mockRegister.mockResolvedValueOnce({ ok: true })

    render(
      <BrowserRouter>
        <Register />
      </BrowserRouter>
    )

    await user.type(screen.getByPlaceholderText('Enter your name'), 'Test User')
    await user.type(screen.getByPlaceholderText('Enter your email'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('Enter your password'), 'password123')
    await user.click(screen.getByText('Register'))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login')
      expect(localStorage.getItem('is_new_user_test@example.com')).toBe('true')
    })
  })

  it('should display error message on registration failure', async () => {
    const user = userEvent.setup()
    const mockRegister = vi.mocked(auth.register)
    mockRegister.mockResolvedValueOnce({ ok: false, error: 'Email already exists' })

    render(
      <BrowserRouter>
        <Register />
      </BrowserRouter>
    )

    await user.type(screen.getByPlaceholderText('Enter your name'), 'Test User')
    await user.type(screen.getByPlaceholderText('Enter your email'), 'existing@example.com')
    await user.type(screen.getByPlaceholderText('Enter your password'), 'password123')
    await user.click(screen.getByText('Register'))

    await waitFor(() => {
      expect(screen.getByText('Email already exists')).toBeInTheDocument()
    })
  })

  it('should show link to login page', () => {
    render(
      <BrowserRouter>
        <Register />
      </BrowserRouter>
    )

    const loginLink = screen.getByText('Login')
    expect(loginLink).toBeInTheDocument()
    expect(loginLink.closest('a')).toHaveAttribute('href', '/login')
  })
})

