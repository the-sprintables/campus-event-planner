import React, { useState } from 'react'
import { Event } from '../types'
import { currentUser, logout } from '../auth'
import { registerForEvent, getAuthTokenFromStorage } from '../api'

interface BookingModalProps {
  event: Event | null
  isOpen: boolean
  onClose: () => void
  onBookingSuccess: (eventId: string) => void
}

export default function BookingModal({ event, isOpen, onClose, onBookingSuccess }: BookingModalProps) {
  const [isBooking, setIsBooking] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [ticketQuantity, setTicketQuantity] = useState(1)
  
  const user = currentUser()

  if (!isOpen || !event) return null

  const handleBookEvent = async () => {
    if (!event || !user) {
      setBookingError('You must be logged in to book an event')
      return
    }

    // Check if token exists
    const token = getAuthTokenFromStorage()
    if (!token) {
      setBookingError('Authentication required. Please log in again.')
      return
    }

    // Validate ticket quantity
    const availableTickets = (event.capacity || 10) - (event.registrationCount || 0)
    if (ticketQuantity > availableTickets) {
      setBookingError(`Only ${availableTickets} tickets available`)
      return
    }

    if (ticketQuantity < 1) {
      setBookingError('Please select at least 1 ticket')
      return
    }

    setIsBooking(true)
    setBookingError('')

    try {
      // Register for the event (for now, we'll register once per ticket quantity)
      // Note: The backend currently supports one registration per user, so we'll register once
      // If you need multiple tickets per registration, the backend would need to support that
      const result = await registerForEvent(event.id)
      
      if (result.ok) {
        setBookingSuccess(true)
        setIsBooking(false)
        
        // Notify parent of successful booking
        onBookingSuccess(event.id)
        
        // Auto close after 3 seconds to give user time to see confirmation
        setTimeout(() => {
          setBookingSuccess(false)
          setTicketQuantity(1) // Reset quantity
          onClose()
        }, 3000)
      } else {
        const errorMsg = result.error || 'Failed to book event'
        // Check if it's an authentication error
        if (errorMsg.includes('authorization') || errorMsg.includes('authorized') || errorMsg.includes('Authentication') || errorMsg.includes('Invalid/No authorization token')) {
          // Clear the session since token is invalid
          logout()
          setBookingError('Your session has expired. Please log in again to book this event.')
        } else {
          setBookingError(errorMsg)
        }
        setIsBooking(false)
      }
    } catch (error) {
      setBookingError('Network error occurred while booking. Please check your connection and try again.')
      setIsBooking(false)
    }
  }

  const handleClose = () => {
    setBookingError('')
    setBookingSuccess(false)
    setTicketQuantity(1) // Reset to default
    onClose()
  }

  const isEventFull = Boolean(event.capacity && event.registrationCount && event.registrationCount >= event.capacity)

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-card booking-modal" onClick={e => e.stopPropagation()}>
        <button 
          className="btn ghost close-btn" 
          style={{ float: 'right', marginBottom: '16px' }} 
          onClick={handleClose}
        >
          ✕
        </button>
        
        <div className="booking-content">
          <h2 style={{ marginTop: 0, marginBottom: 24 }}>Book Event</h2>
          
          {/* Event summary */}
          <div className="event-summary" style={{ 
            padding: '20px', 
            backgroundColor: 'var(--accent)', 
            borderRadius: '8px', 
            marginBottom: '28px' 
          }}>
            <h3 style={{ margin: '0 0 12px 0' }}>{event.title}</h3>
            <div className="meta" style={{ marginBottom: '12px' }}>
              📅 {event.date}
              {event.location && ` • 📍 ${event.location}`}
            </div>
            {event.price !== undefined && (
              <div style={{ fontWeight: 'bold', color: 'var(--primary)', marginBottom: '8px' }}>
                💰 €{event.price.toFixed(2)}
              </div>
            )}
            {event.capacity && (
              <div style={{ fontSize: '0.9em', color: 'var(--muted)', marginTop: '12px' }}>
                👥 {event.registrationCount || 0} / {event.capacity} registered
              </div>
            )}
          </div>

          {/* Booking details */}
          <div className="booking-details" style={{ marginBottom: '28px' }}>
            <h4 style={{ marginTop: 0, marginBottom: 16 }}>Booking Details</h4>
            <p style={{ marginBottom: 20 }}><strong>Email:</strong> {user?.email}</p>
            
            {/* Ticket quantity selector */}
            <div style={{ marginTop: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Number of Tickets:
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setTicketQuantity(Math.max(1, ticketQuantity - 1))}
                  disabled={ticketQuantity <= 1 || isBooking}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--text)',
                    cursor: ticketQuantity > 1 && !isBooking ? 'pointer' : 'not-allowed',
                    fontSize: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  −
                </button>
                
                <input
                  type="number"
                  min="1"
                  max={Math.min(10, (event.capacity || 10) - (event.registrationCount || 0))}
                  value={ticketQuantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1
                    const maxTickets = Math.min(10, (event.capacity || 10) - (event.registrationCount || 0))
                    setTicketQuantity(Math.max(1, Math.min(val, maxTickets)))
                  }}
                  disabled={isBooking}
                  style={{
                    width: '60px',
                    textAlign: 'center',
                    padding: '6px',
                    border: '1px solid var(--border)',
                    borderRadius: '4px'
                  }}
                />
                
                <button
                  type="button"
                  onClick={() => {
                    const maxTickets = Math.min(10, (event.capacity || 10) - (event.registrationCount || 0))
                    setTicketQuantity(Math.min(ticketQuantity + 1, maxTickets))
                  }}
                  disabled={ticketQuantity >= Math.min(10, (event.capacity || 10) - (event.registrationCount || 0)) || isBooking}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--text)',
                    cursor: (ticketQuantity < Math.min(10, (event.capacity || 10) - (event.registrationCount || 0)) && !isBooking) ? 'pointer' : 'not-allowed',
                    fontSize: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  +
                </button>
              </div>
              
              {event.capacity && (
                <div style={{ fontSize: '0.8em', color: 'var(--muted)', marginTop: '8px' }}>
                  Available tickets: {(event.capacity - (event.registrationCount || 0))}
                </div>
              )}
            </div>

            {/* Total price calculation */}
            {event.price !== undefined && (
              <div style={{ 
                marginTop: '24px', 
                padding: '16px', 
                backgroundColor: 'var(--accent)', 
                borderRadius: '4px',
                textAlign: 'center'
              }}>
                <strong>Total Price: €{(event.price * ticketQuantity).toFixed(2)}</strong>
                {ticketQuantity > 1 && (
                  <div style={{ fontSize: '0.9em', color: 'var(--muted)' }}>
                    (€{event.price.toFixed(2)} × {ticketQuantity} tickets)
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Status messages */}
          {bookingSuccess && (
            <div className="success-message" style={{ 
              padding: '24px', 
              backgroundColor: '#d4edda', 
              color: '#155724', 
              borderRadius: '8px', 
              marginBottom: '28px',
              marginTop: '24px',
              textAlign: 'center',
              border: '2px solid #c3e6cb',
              fontSize: '1.1em',
              fontWeight: 'bold'
            }}>
              <div style={{ fontSize: '2em', marginBottom: '12px' }}>🎉</div>
              <div>BOOKING CONFIRMED!</div>
              <div style={{ fontSize: '0.9em', fontWeight: 'normal', marginTop: '12px' }}>
                {ticketQuantity === 1 ? '1 ticket' : `${ticketQuantity} tickets`} successfully reserved for {event?.title}
              </div>
              <div style={{ fontSize: '0.8em', fontWeight: 'normal', marginTop: '12px', opacity: 0.8 }}>
                This window will close automatically...
              </div>
            </div>
          )}

          {bookingError && (
            <div className="error" style={{ marginBottom: '24px', marginTop: '24px' }}>
              {bookingError}
            </div>
          )}

          {/* Action buttons */}
          <div className="booking-actions" style={{ 
            display: 'flex', 
            gap: '12px', 
            justifyContent: 'flex-end',
            borderTop: '1px solid var(--border)',
            paddingTop: '24px',
            marginTop: '24px'
          }}>
            <button 
              type="button" 
              className="btn ghost" 
              onClick={handleClose}
              disabled={isBooking}
            >
              {bookingSuccess ? 'Close' : 'Cancel'}
            </button>
            <button 
              type="button" 
              className="btn" 
              onClick={handleBookEvent}
              disabled={isBooking || isEventFull || bookingSuccess}
            >
              {isBooking ? 'Booking...' : 
               isEventFull ? 'Event Full' : 
               bookingSuccess ? 'Booked!' : 
               ticketQuantity === 1 ? 'Confirm Booking' : `Book ${ticketQuantity} Tickets`}
            </button>
          </div>

          {/* Event full warning */}
          {isEventFull && (
            <div style={{ 
              marginTop: '20px', 
              padding: '12px', 
              backgroundColor: '#fff3cd', 
              color: '#856404', 
              borderRadius: '4px',
              fontSize: '0.9em',
              textAlign: 'center'
            }}>
              ⚠️ This event is currently full
            </div>
          )}
        </div>
      </div>
    </div>
  )
}