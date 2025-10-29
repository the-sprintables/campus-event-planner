import React, { useState } from 'react'
import ConfirmDialog from './ConfirmDialog'
import { Event } from '../types'

type Props = {
  events: Event[]
  onSelect?: (e: Event) => void
  onDelete?: (id: string) => void
}

export default function EventList({ events, onSelect, onDelete }: Props) {
  if (!events || events.length === 0) return <div className="empty">No events planned yet.</div>
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)

  function askDelete(id: string) {
    // only allow delete flow when onDelete is provided
    if (!onDelete) return
    setPendingId(id)
    setConfirmOpen(true)
  }

  function cancelDelete() {
    setPendingId(null)
    setConfirmOpen(false)
  }

  function confirmDelete() {
    if (pendingId && onDelete) onDelete(pendingId)
    setPendingId(null)
    setConfirmOpen(false)
  }

  return (
    <>
      <ul className="event-list">
        {events.map(ev => (
          <li key={ev.id} className="event-item">
            <div>
              <div className="title">{ev.title}</div>
              <div className="meta">
                {ev.date}{ev.location ? `  ${ev.location}` : ''}
              </div>
            </div>
            <div className="actions">
              {onSelect && <button type="button" onClick={() => onSelect(ev)} className="btn ghost">View</button>}
              {onDelete && <button type="button" onClick={() => askDelete(ev.id)} className="btn">Delete</button>}
            </div>
          </li>
        ))}
      </ul>
      <ConfirmDialog open={confirmOpen} title="Delete event" message="This action cannot be undone. Delete this event?" onCancel={cancelDelete} onConfirm={confirmDelete} />
    </>
  )
}
