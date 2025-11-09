import React from 'react'
import { Event } from '../types'

export default function EventDetails({ event }: { event: Event | null }) {
  if (!event) return null

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
    </div>
  )
}
