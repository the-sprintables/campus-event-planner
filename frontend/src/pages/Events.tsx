import React, { useState, useEffect } from 'react'
import EventDetails from '../components/EventDetails'
import BookingModal from '../components/BookingModal'
import ConfirmDialog from '../components/ConfirmDialog'
import { Event } from '../types'
import { currentUser } from '../auth'

function getPriorityLabel(priority: string = "available") {
  switch (priority) {
    case "full":
      return "Full";
    case "almost-full":
      return "Almost Full";
    default:
      return "Available";
  }
}

interface EventsPageProps {
  events: Event[]
  onEventUpdate?: (updatedEvent: Event) => void
}

export default function EventsPage({ events, onEventUpdate }: EventsPageProps) {
  const [selected, setSelected] = useState<Event | null>(null)
  const [bookingEvent, setBookingEvent] = useState<Event | null>(null)
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [localEvents, setLocalEvents] = useState<Event[]>(events)
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const [eventToCancel, setEventToCancel] = useState<string | null>(null)
  
  const user = currentUser()

  // Update local events when props change
  useEffect(() => {
    setLocalEvents(events)
  }, [events])

  const handleRegistrationChange = (eventId: string, isRegistered: boolean) => {
    // Update the selected event's registration status
    if (selected && selected.id === eventId) {
      const updatedEvent = { 
        ...selected, 
        isRegistered,
        registrationCount: selected.registrationCount 
          ? (isRegistered ? selected.registrationCount + 1 : selected.registrationCount - 1)
          : undefined
      }
      setSelected(updatedEvent)
      onEventUpdate?.(updatedEvent)
    }
  }

  const handleBookEvent = (event: Event) => {
    setBookingEvent(event)
    setIsBookingModalOpen(true)
  }

  const handleBookingSuccess = (eventId: string) => {
    // Update the local events state
    setLocalEvents(prevEvents => 
      prevEvents.map(event => 
        event.id === eventId 
          ? {
              ...event,
              isRegistered: true,
              registrationCount: (event.registrationCount || 0) + 1
            }
          : event
      )
    )
    
    // Also notify parent component
    const updatedEvent = localEvents.find(e => e.id === eventId)
    if (updatedEvent) {
      const newEvent = {
        ...updatedEvent,
        isRegistered: true,
        registrationCount: (updatedEvent.registrationCount || 0) + 1
      }
      onEventUpdate?.(newEvent)
    }
  }

  const handleCancelBookingClick = (eventId: string) => {
    setEventToCancel(eventId)
    setCancelConfirmOpen(true)
  }

  const handleCancelBooking = () => {
    if (!eventToCancel) return
    
    // Update the local events state
    setLocalEvents(prevEvents => 
      prevEvents.map(event => 
        event.id === eventToCancel 
          ? {
              ...event,
              isRegistered: false,
              registrationCount: Math.max(0, (event.registrationCount || 1) - 1)
            }
          : event
      )
    )
    
    // Also notify parent component
    const updatedEvent = localEvents.find(e => e.id === eventToCancel)
    if (updatedEvent) {
      const newEvent = {
        ...updatedEvent,
        isRegistered: false,
        registrationCount: Math.max(0, (updatedEvent.registrationCount || 1) - 1)
      }
      onEventUpdate?.(newEvent)
    }
    
    // Close confirmation dialog
    setCancelConfirmOpen(false)
    setEventToCancel(null)
  }

  const handleCancelConfirmClose = () => {
    setCancelConfirmOpen(false)
    setEventToCancel(null)
  }

  const handleCloseBookingModal = () => {
    setIsBookingModalOpen(false)
    setBookingEvent(null)
  }
  
  // Handle null or undefined events
  if (!localEvents || !Array.isArray(localEvents)) {
    return <div className="events-page">No events available.</div>
  }

  return (
    <div className="events-page mb-20">
      <section className="left px-8 my-8">
        <div className="view-grid">
          {localEvents.length === 0 ? (
            <div className="empty">No events planned yet.</div>
          ) : (
            localEvents.map(ev => (
            <div key={ev.id} className="event-card card">
              {/* media: use image if available via background-image, else gradient based on color */}
              <div
                className="media"
                style={ev.imageData && ev.imageData.trim() !== ''
                  ? { backgroundImage: `url(${ev.imageData})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }
                  : { background: ev.color && ev.color.trim() !== '' ? `linear-gradient(120deg, ${ev.color}, #ffffff)` : 'linear-gradient(120deg, #fef3c7, #ffffff)' }
                }
              />
              <div className="badge">{getPriorityLabel(ev.priority)}</div>
              <div className="title">{ev.title}</div>
              <div className="meta">{ev.date}{ev.location ? ` • ${ev.location}` : ''}</div>
              <div className="price">{ev.price !== undefined ? `From €${ev.price.toFixed(2)}` : ''}</div>
              <div style={{marginTop:10, display: 'flex', gap: '8px'}}>
                <button className="btn ghost" onClick={() => setSelected(ev)}>View</button>
                {user && user.role !== 'admin' && (
                  <button 
                    className={ev.isRegistered ? "btn" : "btn"} 
                    style={ev.isRegistered ? {
                      backgroundColor: '#dc3545',
                      borderColor: '#dc3545',
                      color: 'white'
                    } : {}}
                    onClick={() => ev.isRegistered ? handleCancelBookingClick(ev.id) : handleBookEvent(ev)}
                    disabled={!ev.isRegistered && Boolean(ev.capacity && ev.registrationCount && ev.registrationCount >= ev.capacity)}
                  >
                    {ev.isRegistered ? 'Cancel Booking' : 
                     Boolean(ev.capacity && ev.registrationCount && ev.registrationCount >= ev.capacity) ? 'Full' : 'Book'}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* Modal popup for selected event */}
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              className="btn ghost"
              style={{ float: "right" }}
              onClick={() => setSelected(null)}
            >
              Close
            </button>
            <EventDetails event={selected} />
          </div>
        </div>
      )}

      {/* Booking Modal */}
      <BookingModal
        event={bookingEvent}
        isOpen={isBookingModalOpen}
        onClose={handleCloseBookingModal}
        onBookingSuccess={handleBookingSuccess}
      />

      {/* Cancel Booking Confirmation Dialog */}
      <ConfirmDialog
        open={cancelConfirmOpen}
        title="Cancel Booking"
        message="Are you sure you want to cancel your booking for this event? This action cannot be undone."
        onCancel={handleCancelConfirmClose}
        onConfirm={handleCancelBooking}
        cancelText="Keep Booking"
        confirmText="Cancel Booking"
        confirmButtonStyle={{
          backgroundColor: '#dc3545',
          borderColor: '#dc3545',
          color: 'white'
        }}
      />
    </div>
  );
}
