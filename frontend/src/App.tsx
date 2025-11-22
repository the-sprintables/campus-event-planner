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
import * as api from './api'
import Feed from './pages/Feed'
import Footer from './pages/Footer'
import Profile from './pages/Profile'

export default function App() {
  const navigate = useNavigate()
  const user = currentUser()
  
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true)
      setError(null)
      
      const isBackendReachable = await api.checkBackendHealth()
      if (!isBackendReachable) {
        setError('Cannot connect to backend server. Please make sure the backend is running on http://localhost:8080')
        setLoading(false)
        return
      }
      
      const result = await api.getEvents()
      if (result.ok) {
        
        setEvents(result.events || [])
      } else {
        setError(result.error || 'Failed to load events')
        setEvents([])
      }
      setLoading(false)
    }

    fetchEvents()
  }, [])

  async function addEvent(e: Event) {
    const result = await api.createEvent(e)
    if (result.ok && result.event) {
      setEvents(prev => [result.event!, ...prev])
    } else {
      alert(result.error || 'Failed to create event')
    }
  }

  async function updateEvent(updated: Event) {
    const result = await api.updateEvent(updated.id, updated)
    if (result.ok) {
      // Refresh events from server to get latest data
      const fetchResult = await api.getEvents()
      if (fetchResult.ok && fetchResult.events) {
        setEvents(fetchResult.events)
      }
    } else {
      alert(result.error || 'Failed to update event')
    }
  }

  async function removeEvent(id: string) {
    const result = await api.deleteEvent(id)
    if (result.ok) {
      setEvents(prev => prev.filter(ev => ev.id !== id))
    } else {
      alert(result.error || 'Failed to delete event')
    }
  }

  return (
    <div className="app bg-white flex flex-col min-h-screen">
      <header>
        <Link to="/">The Sprintables!</Link>
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
              <Link to="/profile">Profile</Link> |
              <span>Welcome, {user.email}</span>
              <button onClick={handleLogout} style={{ marginLeft: 8 }}>Logout</button>
            </>
          )}
        </nav>
      </header>
      <main className='flex-1'>
        {loading && <div>Loading events...</div>}
        {error && <div className="error">{error}</div>}
        <Routes>
          <Route path="/" element={(
            <RequireAuth>
              <EventsPage events={events} onEventUpdate={updateEvent} />
            </RequireAuth>
          )} />
          <Route path="/manage" element={(
            <RequireAdmin>
              <ManageEventsPage initialEvents={events} onCreate={addEvent} onDelete={removeEvent} onUpdate={updateEvent} />
            </RequireAdmin>
          )} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/profile" element={(
            <RequireAuth>
              <Profile />
            </RequireAuth>
          )} />
        </Routes>
        
      </main>
      <Footer />
    </div>
  )
}
