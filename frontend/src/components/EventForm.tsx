import React, { useEffect, useState } from 'react'
import { Event } from '../types'

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

async function handleImageUpload(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 5000000) { // 5MB limit
      reject(new Error('File size must be less than 5MB'))
      return
    }

    if (!file.type.startsWith('image/')) {
      reject(new Error('File must be an image'))
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      resolve(reader.result as string)
    }
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    reader.readAsDataURL(file)
  })
}

export default function EventForm({ onCreate, onUpdate, editingEvent }: { onCreate?: (e: Event) => void; onUpdate?: (e: Event) => void; editingEvent?: Event | null }) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [imageData, setImageData] = useState('')
  const [imageError, setImageError] = useState('')
  const [color, setColor] = useState('#fef3c7')
  const [priority, setPriority] = useState<'available' | 'almost-full' | 'full'>('available')

  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title || '')
      setDate(editingEvent.date || '')
      setLocation(editingEvent.location || '')
      setDescription(editingEvent.description || '')
      setPrice(editingEvent.price !== undefined ? String(editingEvent.price) : '')
      setImageData(editingEvent.imageData || '')
      setColor(editingEvent.color || '#fef3c7')
      setPriority(editingEvent.priority || 'available')
    } else {
      setTitle('')
      setDate('')
      setLocation('')
      setDescription('')
      setPrice('')
      setImageData('')
      setColor('#fef3c7')
      setPriority('available')
    }
  }, [editingEvent])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const t = title.trim()
    const d = date.trim()
    if (!t || !d) return
    const newEvent: Event = {
      id: editingEvent?.id || uid(),
      title: t,
      date: d,
      location: location.trim() || undefined,
      description: description.trim() || undefined,
      price: price ? Number(price) : undefined,
      ownerEmail: editingEvent?.ownerEmail,
      imageData: imageData || undefined,
      color: color || undefined,
      priority
    }
    if (editingEvent && onUpdate) {
      onUpdate(newEvent)
    } else if (!editingEvent && onCreate) {
      onCreate(newEvent)
    }
    // reset handled by effect when editingEvent becomes null
  }

  return (
    <form className="event-form" onSubmit={submit}>
      <h2>Create event</h2>
      <label>
        Title
        <input value={title} onChange={e => setTitle(e.target.value)} required />
      </label>
      <label>
        Date
        <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
      </label>
      <label>
        Location
        <input value={location} onChange={e => setLocation(e.target.value)} />
      </label>
      <label>
        Description
        <textarea value={description} onChange={e => setDescription(e.target.value)} />
      </label>
      <label>
        Price (EUR)
        <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} />
      </label>
      <label>
        Event Image
        <div className="file-input-container">
          <input 
            type="file" 
            accept="image/*"
            onChange={async (e) => {
              setImageError('')
              const file = e.target.files?.[0]
              if (!file) return
              
              try {
                const data = await handleImageUpload(file)
                setImageData(data)
              } catch (err) {
                setImageError(err instanceof Error ? err.message : 'Failed to upload image')
              }
            }}
          />
          {imageError && <div className="error">{imageError}</div>}
        </div>
      </label>
      {imageData && (
        <div style={{ marginBottom: '1rem' }}>
          <img 
            src={imageData} 
            alt="Event preview" 
            style={{ maxWidth: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px' }} 
          />
          <button 
            type="button" 
            className="btn ghost" 
            onClick={() => setImageData('')}
            style={{ marginTop: '0.5rem' }}
          >
            Remove image
          </button>
        </div>
      )}

      <label>
        Background Color (used if no image uploaded)
        <input type="color" value={color} onChange={e => setColor(e.target.value)} />
      </label>
      <label>
        Priority Status
        <select value={priority} onChange={e => setPriority(e.target.value as 'available' | 'almost-full' | 'full')}>
          <option value="available">Available</option>
          <option value="almost-full">Almost Full</option>
          <option value="full">Full</option>
        </select>
      </label>
      <div className="form-actions">
        <button type="submit">{editingEvent ? 'Save changes' : 'Add event'}</button>
        {editingEvent && (
          <button type="button" className="btn ghost" onClick={() => onUpdate?.(editingEvent)}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
