import React, { useState, useEffect } from 'react'
import { Event } from '../types'
import { registerForEvent, unregisterFromEvent } from '../api'
import { currentUser } from '../auth'

interface EventDetailsProps {
  event: Event | null
  onRegistrationChange?: (eventId: string, isRegistered: boolean) => void
}

export default function EventDetails({ event, onRegistrationChange }: EventDetailsProps) {
  const [isRegistered, setIsRegistered] = useState<boolean>(event?.isRegistered || false)
  const [registrationLoading, setRegistrationLoading] = useState<boolean>(false)
  const [registrationError, setRegistrationError] = useState<string>('')
  
  const user = currentUser()

  // Update isRegistered when event changes
  useEffect(() => {
    if (event) {
      setIsRegistered(event.isRegistered || false)
    }
  }, [event])

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
      {event.imageData && event.imageData.trim() !== "" ? (
        <div style={{ marginBottom: 24 }}>
          <img
            src={event.imageData}
            alt={event.title}
            style={{
              width: "100%",
              height: 300,
              objectFit: "cover",
              borderRadius: 8,
            }}
          />
        </div>
      ) : (
        <div
          style={{
            height: 200,
            borderRadius: 8,
            marginBottom: 24,
            background:
              event.color && event.color.trim() !== ""
                ? `linear-gradient(120deg, ${event.color}, #ffffff)`
                : "linear-gradient(120deg, #fef3c7, #ffffff)",
          }}
        />
      )}

      <h2 style={{ marginTop: 0, marginBottom: 12 }}>{event.title}</h2>
      <div className="meta" style={{ marginBottom: 20 }}>
        {event.date}
        {event.location ? ` • ${event.location}` : ""}
      </div>
      {event.description && <p style={{ marginBottom: 24, lineHeight: 1.6 }}>{event.description}</p>}
      
      {/* Registration info */}
      {event.capacity && (
        <div className="registration-info" style={{ marginTop: 24, marginBottom: 20, color: 'var(--muted)' }}>
          {event.registrationCount !== undefined ? (
            <span>{event.registrationCount} / {event.capacity} registered</span>
          ) : (
            <span>Capacity: {event.capacity}</span>
          )}
        </div>
      )}

      {/* Registration button */}
      {canRegister && (
        <div className="registration-section" style={{ marginTop: 24 }}>
          <button 
            className={isRegistered ? "btn ghost" : "btn"}
            onClick={handleRegistration}
            disabled={registrationLoading || (isEventFull && !isRegistered)}
            style={isRegistered ? {
              backgroundColor: '#dc3545',
              borderColor: '#dc3545',
              color: 'white',
              marginRight: 8
            } : { marginRight: 8 }}
          >
            {registrationLoading ? 'Processing...' : 
             isRegistered ? 'Cancel Booking' : 
             isEventFull ? 'Event Full' : 'Book Event'}
          </button>
          
          {isRegistered && !registrationLoading && (
            <span style={{ color: 'green', fontSize: '0.9em' }}>
              ✓ You are registered
            </span>
          )}
          
          {registrationError && (
            <div className="error" style={{ marginTop: 12, fontSize: '0.9em' }}>
              {registrationError}
            </div>
          )}
        </div>
      )}

      {/* Show login prompt for guests */}
      {!user && (
        <div style={{ marginTop: 24, padding: 12, backgroundColor: 'var(--accent)', borderRadius: 4 }}>
          <p style={{ margin: 0, fontSize: '0.9em' }}>
            Please <a href="/login">login</a> to register for this event.
          </p>
        </div>
      )}
    </div>
  );
}
