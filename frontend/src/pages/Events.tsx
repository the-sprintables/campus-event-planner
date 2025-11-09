import React, { useState } from 'react'
import EventDetails from '../components/EventDetails'
import { Event } from '../types'

function getPriorityLabel(priority: string = 'available') {
  switch (priority) {
    case 'full': return 'Full'
    case 'almost-full': return 'Almost Full'
    default: return 'Available'
  }
}

export default function EventsPage({ events }: { events: Event[] }) {
  const [selected, setSelected] = useState<Event | null>(null)
  
  // Handle null or undefined events
  if (!events || !Array.isArray(events)) {
    return <div className="events-page">No events available.</div>
  }
  
  return (
    <div className="events-page">
      <section className="left">
        <div className="view-grid">
          {events.length === 0 ? (
            <div className="empty">No events planned yet.</div>
          ) : (
            events.map(ev => (
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
              <div style={{marginTop:10}}>
                <button className="btn ghost" onClick={() => setSelected(ev)}>View</button>
              </div>
            </div>
            ))
          )}
        </div>
      </section>

      {/* Modal popup for selected event */}
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <button className="btn ghost" style={{ float: 'right' }} onClick={() => setSelected(null)}>Close</button>
            <EventDetails event={selected} />
          </div>
        </div>
      )}
    </div>
  )
}
