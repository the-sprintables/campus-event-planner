import React from 'react'

type Props = {
  open: boolean
  title?: string
  message?: string
  onCancel: () => void
  onConfirm: () => void
  cancelText?: string
  confirmText?: string
  confirmButtonStyle?: React.CSSProperties
}

export default function ConfirmDialog({ 
  open, 
  title = 'Confirm', 
  message = 'Are you sure?', 
  onCancel, 
  onConfirm,
  cancelText = 'Cancel',
  confirmText = 'Confirm',
  confirmButtonStyle = {}
}: Props) {
  if (!open) return null
  return (
    <div className="confirm-backdrop">
      <div className="confirm-card card">
        <h3>{title}</h3>
        <p style={{ color: 'var(--muted)' }}>{message}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="btn ghost" onClick={onCancel}>{cancelText}</button>
          <button className="btn" onClick={onConfirm} style={confirmButtonStyle}>{confirmText}</button>
        </div>
      </div>
    </div>
  )
}
