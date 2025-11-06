import React, { useState, useEffect } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import { Event } from './types'
import EventList from './components/EventList'
import EventForm from './components/EventForm'
import EventDetails from './components/EventDetails'
import EventsPage from './pages/Events'
import ManageEventsPage from './pages/ManageEvents'
import Register from './pages/Register'
import Login from './pages/Login'
import RequireAuth from './components/RequireAuth'
import RequireAdmin from './components/RequireAdmin'
import { currentUser, logout } from './auth'
import { useNavigate } from 'react-router-dom'

const EVENTS_KEY = 'app_events'

function getStoredEvents(): Event[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveStoredEvents(events: Event[]) {
  try {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events))
  } catch {
    // ignore
  }
}

export default function App() {
  const navigate = useNavigate()
  const user = currentUser()
  function handleLogout() {
    logout()
    navigate('/login')
  }
  const [events, setEvents] = useState<Event[]>(() => getStoredEvents())

  useEffect(() => {
    saveStoredEvents(events)
  }, [events])

  function addEvent(e: Event) {
    setEvents(prev => [e, ...prev])
  }

  function updateEvent(updated: Event) {
    setEvents(prev => prev.map(ev => ev.id === updated.id ? updated : ev))
  }

  function removeEvent(id: string) {
    setEvents(prev => prev.filter(ev => ev.id !== id))
  }

  return (
    <div className="app">
      <header>
        <h1> Sprintables Campus Event Planner</h1>
        <nav>
          <Link to="/">View events</Link> |
          {user?.role === 'admin' && (
            <>
              <Link to="/manage">Manage events</Link> |
            </>
          )}
          {!user && (
            <>
              <Link to="/register"> Register</Link> |
              <Link to="/login"> Login</Link>
            </>
          )}
          {user && (
            <>
              <span>Welcome, {user.name}</span>
              <button onClick={handleLogout} style={{ marginLeft: 8 }}>Logout</button>
            </>
          )}
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={(
            <RequireAuth>
              <EventsPage events={events} />
            </RequireAuth>
          )} />
          <Route path="/manage" element={(
            <RequireAdmin>
              <ManageEventsPage initialEvents={events} onCreate={addEvent} onDelete={removeEvent} onUpdate={updateEvent} />
            </RequireAdmin>
          )} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </main>
    </div>
  )
}
