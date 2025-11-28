import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { currentUser } from '../auth'
import * as api from '../api'
import { Event } from '../types'

const eventTypes = [
  "Sports & Fitness",
  "Music & Entertainment",
  "Parties & Social",
  "Business & Professional",
  "Education & Learning",
  "Arts & Culture",
  "Community & Charity",
  "Food & Drink",
  "Travel & Outdoors",
  "Health & Wellness",
]

export default function Profile() {
  const navigate = useNavigate()
  const user = currentUser()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const lastLoadedEmailRef = useRef<string | null>(null)
  const eventsLoadedRef = useRef<boolean>(false)
  
  // Profile fields
  const [email, setEmail] = useState('')
  const [selectedEventTypes, setSelectedEventTypes] = useState<Record<string, boolean>>({})
  
  // Password reset fields
  const [showPasswordReset, setShowPasswordReset] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  
  // Registered events
  const [registeredEvents, setRegisteredEvents] = useState<Event[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)

  const loadProfile = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    const result = await api.getUserProfile()
    if (result.ok && result.profile) {
      setEmail(result.profile.email || '')
      
      // Initialize selected event types
      const types: Record<string, boolean> = {}
      if (result.profile.preferredEventTypes) {
        result.profile.preferredEventTypes.forEach(type => {
          types[type] = true
        })
      }
      setSelectedEventTypes(types)
    } else {
      setError(result.error || 'Failed to load profile')
    }
    
    setLoading(false)
  }, [])

  const loadRegisteredEvents = useCallback(async () => {
    setLoadingEvents(true)
    try {
      const result = await api.getUserRegisteredEvents()
      if (result.ok && result.events) {
        setRegisteredEvents(result.events)
        eventsLoadedRef.current = true
      } else {
        console.error('Failed to load registered events:', result.error)
        // Set empty array on error to show "no events" message
        setRegisteredEvents([])
        eventsLoadedRef.current = true
      }
    } catch (error) {
      console.error('Error loading registered events:', error)
      setRegisteredEvents([])
      eventsLoadedRef.current = true
    } finally {
      setLoadingEvents(false)
    }
  }, [])

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    // Load profile and events on mount or when user email changes
    const userEmail = user?.email
    if (userEmail) {
      // Load profile if email changed
      if (lastLoadedEmailRef.current !== userEmail) {
        lastLoadedEmailRef.current = userEmail
        eventsLoadedRef.current = false // Reset events loaded flag when user changes
        loadProfile()
        // Load events when user changes
        loadRegisteredEvents()
      } else if (!eventsLoadedRef.current) {
        // Load events on initial mount if not already loaded
        loadRegisteredEvents()
      }
    }
  }, [user?.email, navigate, loadProfile, loadRegisteredEvents])

  // Listen for registration changes from other pages
  useEffect(() => {
    const handleRegistrationChange = () => {
      console.log('Event registration changed, reloading registered events...')
      loadRegisteredEvents()
    }

    // Listen for custom events when booking/canceling
    window.addEventListener('eventRegistrationChanged', handleRegistrationChange)
    
    // Also refresh when the page becomes visible (user might have booked/canceled in another tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Page became visible, reloading registered events...')
        loadRegisteredEvents()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Also refresh when window gains focus (user switches back to this tab)
    const handleFocus = () => {
      console.log('Window gained focus, reloading registered events...')
      loadRegisteredEvents()
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('eventRegistrationChanged', handleRegistrationChange)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [loadRegisteredEvents])

  function handleToggleEventType(type: string) {
    setSelectedEventTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }))
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    // Get all selected event types
    const selectedTypesArray = Object.keys(selectedEventTypes).filter(
      type => selectedEventTypes[type]
    )

    const result = await api.updateUserProfile('', selectedTypesArray)
    if (result.ok) {
      // Also update localStorage for backward compatibility
      if (user?.email) {
        localStorage.setItem(`user_event_types_${user.email}`, JSON.stringify(selectedTypesArray))
        // Store first one as preferred for backward compatibility
        if (selectedTypesArray.length > 0) {
          localStorage.setItem(`user_preferred_event_type_${user.email}`, selectedTypesArray[0])
        }
      }
      setSuccess('Profile updated successfully!')
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } else {
      setError(result.error || 'Failed to update profile')
    }

    setSaving(false)
  }

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(null)

    if (!newPassword || !confirmPassword) {
      setPasswordError('Please fill in all password fields')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }

    const result = await api.updatePassword(newPassword)
    if (result.ok) {
      setPasswordSuccess('Password updated successfully!')
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordReset(false)
      setTimeout(() => setPasswordSuccess(null), 3000)
    } else {
      setPasswordError(result.error || 'Failed to update password')
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-4">
        <div className="card">
          <div className="text-center">Loading profile...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 p-4">
      <div className="card">
        <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--accent)' }}>
          User Profile
        </h2>

        {error && (
          <div className="error" style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: '8px', backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: '8px', backgroundColor: 'var(--success-bg)', color: 'var(--success-text)' }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSaveProfile}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label className="auth-form label" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="auth-form input"
              style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--input-bg)', cursor: 'not-allowed', color: 'var(--text)' }}
            />
            <small style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
              Email cannot be changed
            </small>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label className="auth-form label" style={{ display: 'block', marginBottom: '0.75rem' }}>
              Preferred Event Types (for suggestions)
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '12px',
              marginTop: '8px'
            }}>
              {eventTypes.map((type) => {
                const isSelected = selectedEventTypes[type] || false;
                
                return (
                  <div
                    key={type}
                    onClick={() => handleToggleEventType(type)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      border: isSelected ? `2px solid var(--accent)` : `1px solid var(--border-muted)` ,
                      borderRadius: '8px',
                      backgroundColor: isSelected ? 'var(--accent-glass)' : 'var(--card)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <span style={{ 
                      fontSize: '0.9rem',
                      fontWeight: isSelected ? '600' : '400',
                      color: isSelected ? 'var(--accent)' : 'var(--muted)'
                    }}>
                      {type}
                    </span>
                    {isSelected && (
                      <span style={{ 
                        color: 'var(--success-text)',
                        fontSize: '1.2rem',
                        fontWeight: 'bold'
                      }}>
                        ✓
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <small style={{ color: 'var(--muted)', fontSize: '0.85rem', display: 'block', marginTop: '8px' }}>
              Click on event types to select your preferred types for personalized suggestions
            </small>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button
              type="submit"
              className="btn"
              disabled={saving}
              style={{ minWidth: '120px' }}
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>

        <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #e5e7eb' }}>
          <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--accent)' }}>
            My Registered Events
          </h3>
          
          {loadingEvents ? (
            <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--muted)' }}>
              Loading registered events...
            </div>
          ) : registeredEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--muted)' }}>
              You haven't registered for any events yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {registeredEvents.map((event) => {
                const eventDate = event.date ? new Date(event.date) : null
                const formattedDate = eventDate ? eventDate.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'Date TBD'
                
                return (
                  <div
                    key={event.id}
                    style={{
                      padding: '1rem',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      backgroundColor: 'var(--card)',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent)'
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ 
                          fontSize: '1.1rem', 
                          fontWeight: '600', 
                          marginBottom: '0.5rem',
                          color: 'var(--text)'
                        }}>
                          {event.title}
                        </h4>
                        <p style={{ 
                          fontSize: '0.9rem', 
                          color: 'var(--muted)', 
                          marginBottom: '0.5rem',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {event.description}
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--muted)' }}>
                          <span>📍 {event.location}</span>
                          <span>📅 {formattedDate}</span>
                          {event.price !== undefined && event.price !== null && (
                            <span>💰 ${event.price.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #e5e7eb' }}>
          <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--accent)' }}>
            Password Reset
          </h3>

          {passwordError && (
            <div className="error" style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: '8px', backgroundColor: '#fee2e2', color: '#b91c1c' }}>
              {passwordError}
            </div>
          )}

          {passwordSuccess && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: '8px', backgroundColor: '#d1fae5', color: '#065f46' }}>
              {passwordSuccess}
            </div>
          )}

          {!showPasswordReset ? (
            <button
              type="button"
              className="btn ghost"
              onClick={() => setShowPasswordReset(true)}
            >
              Change Password
            </button>
          ) : (
            <form onSubmit={handlePasswordReset}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="auth-form label" style={{ display: 'block', marginBottom: '0.5rem' }}>
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="auth-form input"
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--input-bg)', color: 'var(--text)' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="auth-form label" style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="auth-form input"
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border)', backgroundColor: 'var(--input-bg)', color: 'var(--text)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="submit"
                  className="btn"
                  style={{ minWidth: '120px' }}
                >
                  Update Password
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => {
                    setShowPasswordReset(false)
                    setNewPassword('')
                    setConfirmPassword('')
                    setPasswordError(null)
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

