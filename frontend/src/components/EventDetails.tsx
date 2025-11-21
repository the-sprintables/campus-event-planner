import React, { useState, useEffect } from 'react'
import { Event } from '../types'
import { registerForEvent, unregisterFromEvent, checkEventRegistration } from '../api'
import { currentUser } from '../auth'

interface EventDetailsProps {
  event: Event | null
  onRegistrationChange?: (eventId: string, isRegistered: boolean) => void
}

export default function EventDetails({ event, onRegistrationChange }: EventDetailsProps) {
  const [isRegistered, setIsRegistered] = useState<boolean>(false)
  const [registrationLoading, setRegistrationLoading] = useState<boolean>(false)
  const [registrationError, setRegistrationError] = useState<string>('')
  const [checkingRegistration, setCheckingRegistration] = useState<boolean>(false)
  
  const user = currentUser()

  // Check registration status when component mounts or event changes
  useEffect(() => {
    if (!event || !user) return

    const checkRegistrationStatus = async () => {
      setCheckingRegistration(true)
      const result = await checkEventRegistration(event.id)
      if (result.ok && result.data) {
        setIsRegistered(result.data.isRegistered)
      } else {
        // If we can't check registration status, fall back to event property
        setIsRegistered(event.isRegistered || false)
      }
      setCheckingRegistration(false)
    }

    checkRegistrationStatus()
  }, [event, user])

  const handleRegistration = async () => {
    if (!event || !user) return

    setRegistrationLoading(true)
    setRegistrationError('')

    try {
      const result = isRegistered 
        ? await unregisterFromEvent(event.id)
        : await registerForEvent(event.id)

      if (result.ok) {
        const newRegistrationStatus = !isRegistered
        setIsRegistered(newRegistrationStatus)
        onRegistrationChange?.(event.id, newRegistrationStatus)
      } else {
        setRegistrationError(result.error || 'Registration failed')
      }
    } catch (error) {
      setRegistrationError('Network error occurred')
    } finally {
      setRegistrationLoading(false)
    }
  }

  if (!event) return null

  const canRegister = user && user.role !== 'admin' // Only regular users can register
  const isEventFull = Boolean(event.capacity && event.registrationCount && event.registrationCount >= event.capacity)

  return (
    <div className="details">
      {/* cover image or color fallback */}
      {event.imageData && event.imageData.trim() !== '' ? (
        <div style={{ marginBottom: 12 }}>
          <img src={event.imageData} alt={event.title} style={{ width: '100%', height: 300, objectFit: 'cover', borderRadius: 8 }} />
        </div>
      ) : (
        <div style={{ height: 200, borderRadius: 8, marginBottom: 12, background: event.color && event.color.trim() !== '' ? `linear-gradient(120deg, ${event.color}, #ffffff)` : 'linear-gradient(120deg, #fef3c7, #ffffff)'}} />
      )}

      <h2>{event.title}</h2>
      <div className="meta">{event.date}{event.location ? ` • ${event.location}` : ''}</div>
      {event.description && <p>{event.description}</p>}
      
      {/* Registration info */}
      {event.capacity && (
        <div className="registration-info" style={{ marginTop: 16, color: 'var(--muted)' }}>
          {event.registrationCount !== undefined ? (
            <span>{event.registrationCount} / {event.capacity} registered</span>
          ) : (
            <span>Capacity: {event.capacity}</span>
          )}
        </div>
      )}

      {/* Registration button */}
      {canRegister && (
        <div className="registration-section" style={{ marginTop: 16 }}>
          {checkingRegistration ? (
            <div style={{ color: 'var(--muted)' }}>Checking registration status...</div>
          ) : (
            <>
              <button 
                className={isRegistered ? "btn ghost" : "btn"}
                onClick={handleRegistration}
                disabled={registrationLoading || (isEventFull && !isRegistered)}
                style={{ marginRight: 8 }}
              >
                {registrationLoading ? 'Processing...' : 
                 isRegistered ? 'Unregister' : 
                 isEventFull ? 'Event Full' : 'Register'}
              </button>
              
              {isRegistered && (
                <span style={{ color: 'green', fontSize: '0.9em' }}>
                  ✓ You are registered
                </span>
              )}
            </>
          )}
          
          {registrationError && (
            <div className="error" style={{ marginTop: 8, fontSize: '0.9em' }}>
              {registrationError}
            </div>
          )}
        </div>
      )}

      {/* Show login prompt for guests */}
      {!user && (
        <div style={{ marginTop: 16, padding: 12, backgroundColor: 'var(--accent)', borderRadius: 4 }}>
          <p style={{ margin: 0, fontSize: '0.9em' }}>
            Please <a href="/login">login</a> to register for this event.
          </p>
        </div>
      )}
    </div>
  )
}
