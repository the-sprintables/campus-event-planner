import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { currentUser } from '../auth'

export default function RequireAdmin({ children }: { children: JSX.Element }) {
  const user = currentUser()
  const location = useLocation()
  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return children
}
