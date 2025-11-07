import React, { useState } from 'react'
import EventForm from '../components/EventForm'
import EventList from '../components/EventList'
import { Event } from '../types'
import { currentUser, updatePassword } from '../auth'

export default function ManageEventsPage({ initialEvents, onCreate, onDelete, onUpdate }: { initialEvents: Event[]; onCreate: (e: Event) => void; onDelete: (id: string) => void; onUpdate?: (e: Event) => void }) {
  const [editing, setEditing] = useState<Event | null>(null)
  const [newPass, setNewPass] = useState('')
  const user = currentUser()

  function handleCreate(e: Event) {
    e.ownerEmail = user?.email
    onCreate(e)
  }

  function handleUpdate(e: Event) {
    e.ownerEmail = editing?.ownerEmail || user?.email
    if (onUpdate) onUpdate(e)
    setEditing(null)
  }

  function handleChangePassword() {
    if (!user || !newPass) return
    const res = updatePassword(user.email, newPass)
    if (res.ok) {
      setNewPass('')
      alert('Password updated')
    } else {
      alert(res.error || 'Failed')
    }
  }

  return (
    <div className="manage-events">
      <section className="manage-left">
        <EventForm onCreate={handleCreate} onUpdate={handleUpdate} editingEvent={editing} />
        {user?.role === 'admin' && (
          <div style={{ marginTop: 18 }} className="card">
            <h3>Admin settings</h3>
            <label>
              New password
              <input value={newPass} onChange={e => setNewPass(e.target.value)} />
            </label>
            <div style={{ marginTop: 8 }}>
              <button className="btn" onClick={handleChangePassword}>Change password</button>
            </div>
          </div>
        )}
      </section>
      <section className="manage-right">
        <h2>Your events</h2>
        <EventList events={initialEvents} onDelete={onDelete} onSelect={(e) => setEditing(e)} />
      </section>
    </div>
  )
}
