import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { currentUser } from '../auth'

export default function RequireAuth({ children }: { children: JSX.Element }) {
  const user = currentUser()
  const location = useLocation()
  if (!user) {
    // redirect to login, preserve where we were trying to go
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return children
}
