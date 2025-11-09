import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../auth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'user' | ''>('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email || !password || !role) {
      setError('Please fill all fields and select a role')
      return
    }
    const res = await login(email, password, role as 'admin' | 'user')
    if (!res.ok) {
      setError(res.error ?? 'Invalid credentials')
      return
    }
    // successful login -> go to home
    navigate('/')
  }

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <h2 className="auth-title">Login</h2>
        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Email
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </label>
          <div style={{ marginTop: 10 }}>
            <div style={{ marginBottom: 6 }}>Select role to login as</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className={role === 'user' ? 'btn' : 'btn ghost'} onClick={() => setRole('user')}>User</button>
              <button type="button" className={role === 'admin' ? 'btn' : 'btn ghost'} onClick={() => setRole('admin')}>Admin</button>
            </div>
          </div>
          {error && <div className="error">{error}</div>}
          <div className="auth-actions">
            <button type="submit" className="btn">Login</button>
          </div>
        </form>
      </div>
    </div>
  )
}
