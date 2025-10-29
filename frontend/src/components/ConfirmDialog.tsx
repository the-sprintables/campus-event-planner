import React from 'react'

type Props = {
  open: boolean
  title?: string
  message?: string
  onCancel: () => void
  onConfirm: () => void
}

export default function ConfirmDialog({ open, title = 'Confirm', message = 'Are you sure?', onCancel, onConfirm }: Props) {
  if (!open) return null
  return (
    <div className="confirm-backdrop">
      <div className="confirm-card card">
        <h3>{title}</h3>
        <p style={{ color: 'var(--muted)' }}>{message}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
          <button className="btn" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  )
}
