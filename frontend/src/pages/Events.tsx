import React, { useState, useEffect, useRef } from 'react'
import EventDetails from '../components/EventDetails'
import BookingModal from '../components/BookingModal'
import ConfirmDialog from '../components/ConfirmDialog'
import { Event } from '../types'
import { currentUser } from '../auth'
import { unregisterFromEvent, checkEventRegistration } from '../api'

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
  const [showFilter, setShowFilter] = useState(false)
  const [selectedEventTypes, setSelectedEventTypes] = useState<Record<string, boolean>>({})
  const checkedEventIdsRef = useRef<Set<string>>(new Set())
  const lastCheckedEventIdsRef = useRef<string>('')
  
  const user = currentUser()
  
  // Predefined list of event types (same as in Feed.tsx and EventForm.tsx)
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

  // Update local events when props change
  useEffect(() => {
    setLocalEvents(events)
  }, [events])
  
  // Check registration status for all events when they're loaded
  useEffect(() => {
    async function checkRegistrations() {
      if (!user || user.role === 'admin') {
        // Admins don't need registration status, and unauthenticated users can't register
        return
      }
      
      // Get current event IDs as a sorted string for comparison
      const currentEventIdsString = events.map(e => e.id).sort().join(',')
      
      // Check if we've already checked these exact events
      if (currentEventIdsString === lastCheckedEventIdsRef.current && currentEventIdsString !== '') {
        // Already checked these events, skip
        return
      }
      
      // Only check events we haven't checked yet
      const eventsToCheck = events.filter(event => !checkedEventIdsRef.current.has(event.id))
      
      if (eventsToCheck.length === 0 && currentEventIdsString === lastCheckedEventIdsRef.current) {
        // All events already checked and no new events
        return
      }
      
      // Check registration status for new events in parallel
      const registrationChecks = eventsToCheck.map(async (event) => {
        const result = await checkEventRegistration(event.id)
        if (result.ok && result.data) {
          return { eventId: event.id, isRegistered: result.data.isRegistered }
        }
        return { eventId: event.id, isRegistered: false }
      })
      
      const results = await Promise.all(registrationChecks)
      
      // Mark these events as checked
      eventsToCheck.forEach(event => checkedEventIdsRef.current.add(event.id))
      
      // Update the last checked event IDs string
      lastCheckedEventIdsRef.current = currentEventIdsString
      
      // Update local events with registration status
      setLocalEvents(prevEvents => 
        prevEvents.map(event => {
          const registrationResult = results.find(r => r.eventId === event.id)
          if (registrationResult) {
            return { ...event, isRegistered: registrationResult.isRegistered }
          }
          // If event was already checked before, preserve its isRegistered status
          return event
        })
      )
    }
    
    if (events.length > 0) {
      checkRegistrations()
    }
  }, [events, user])
  
  // Filter events based on selected event types
  useEffect(() => {
    const selectedTypes = Object.keys(selectedEventTypes).filter(type => selectedEventTypes[type])
    
    if (selectedTypes.length === 0) {
      // No filters selected, show all events
      setLocalEvents(events)
    } else {
      // Filter events by selected types
      const filtered = events.filter(event => {
        if (!event.eventType) return false;
        // Handle both string and array formats
        const eventTypes = Array.isArray(event.eventType) ? event.eventType : [event.eventType];
        return eventTypes.some(type => selectedTypes.includes(type));
      })
      setLocalEvents(filtered)
    }
  }, [selectedEventTypes, events])
  
  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showFilter && !target.closest('[data-filter-container]')) {
        setShowFilter(false)
      }
    }
    
    if (showFilter) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFilter])
  
  const toggleEventType = (eventType: string) => {
    setSelectedEventTypes(prev => ({
      ...prev,
      [eventType]: !prev[eventType]
    }))
  }

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
      
      // Also update local events list
      setLocalEvents(prevEvents => 
        prevEvents.map(event => 
          event.id === eventId ? updatedEvent : event
        )
      )
      
      // Note: We don't call onEventUpdate here because that's for updating event details,
      // not for managing registrations. Registration changes are handled via the API directly.
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
    
    // Update selected event if it's the one being booked
    if (selected && selected.id === eventId) {
      setSelected({
        ...selected,
        isRegistered: true,
        registrationCount: (selected.registrationCount || 0) + 1
      })
    }
    
    // Note: We don't call onEventUpdate here because that's for updating event details,
    // not for managing registrations. Registration changes are handled via the API directly.
  }

  const handleCancelBookingClick = (eventId: string) => {
    setEventToCancel(eventId)
    setCancelConfirmOpen(true)
  }

  const handleCancelBooking = async () => {
    if (!eventToCancel) return
    
    try {
      // Call API to cancel registration
      const result = await unregisterFromEvent(eventToCancel)
      
      if (result.ok) {
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
        
        // Update selected event if it's the one being canceled
        if (selected && selected.id === eventToCancel) {
          setSelected({
            ...selected,
            isRegistered: false,
            registrationCount: Math.max(0, (selected.registrationCount || 1) - 1)
          })
        }
        
        // Note: We don't call onEventUpdate here because that's for updating event details,
        // not for managing registrations. Registration changes are handled via the API directly.
        
        // Close confirmation dialog
        setCancelConfirmOpen(false)
        setEventToCancel(null)
      } else {
        // Show error (you might want to add error state handling here)
        console.error('Failed to cancel booking:', result.error)
        alert(result.error || 'Failed to cancel booking')
      }
    } catch (error) {
      console.error('Error canceling booking:', error)
      alert('Network error occurred while canceling booking')
    }
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
        {/* Filter button and filter panel */}
        <div data-filter-container style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px', position: 'relative' }}>
          <button
            className="btn ghost"
            onClick={() => setShowFilter(!showFilter)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            🔍 Filter
          </button>
          
          {showFilter && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '8px',
              background: 'white',
              border: '1px solid rgba(15,23,42,0.1)',
              borderRadius: '8px',
              padding: '16px',
              boxShadow: '0 8px 30px rgba(15,23,42,0.1)',
              zIndex: 100,
              minWidth: '200px'
            }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 'bold' }}>Filter by Event Type</h4>
              {eventTypes.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: '0.9em' }}>No event types available</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {eventTypes.map(type => (
                    <label
                      key={type}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        padding: '4px 0'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedEventTypes[type] || false}
                        onChange={() => toggleEventType(type)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>{type}</span>
                    </label>
                  ))}
                </div>
              )}
              {Object.keys(selectedEventTypes).some(type => selectedEventTypes[type]) && (
                <button
                  className="btn ghost"
                  onClick={() => setSelectedEventTypes({})}
                  style={{ marginTop: '12px', width: '100%', fontSize: '0.9em' }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </div>
        
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
              {(ev.capacity !== undefined || ev.ticketsAvailable !== undefined) && (
                <div className="badge" style={{ 
                  marginTop: '12px', 
                  marginBottom: '12px', 
                  padding: '10px 16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: '1.2'
                }}>
                  {Math.max(0, (ev.capacity ?? ev.ticketsAvailable ?? 0) - (ev.registrationCount || 0))} tickets left
                </div>
              )}
              <div className="title">{ev.title}</div>
              <div className="meta">{ev.date}{ev.location ? ` • ${ev.location}` : ''}</div>
              {/* Event types */}
              {ev.eventType && (
                <div style={{ 
                  marginTop: '8px', 
                  marginBottom: '8px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px'
                }}>
                  {(Array.isArray(ev.eventType) ? ev.eventType : [ev.eventType]).map((type, index) => (
                    <span
                      key={index}
                      style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        color: '#2563eb',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}
                    >
                      {type}
                    </span>
                  ))}
                </div>
              )}
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
