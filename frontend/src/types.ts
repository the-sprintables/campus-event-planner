export type EventPriority = 'available' | 'almost-full' | 'full'

export type Event = {
  id: string
  title: string
  date: string
  location?: string
  description?: string
  price?: number
  ownerEmail?: string
  imageData?: string // base64 encoded image data
  color?: string // fallback background color when no image is provided
  priority?: EventPriority
  eventType?: string | string[] // Can be single string (for backward compatibility) or array for multiple types

  ticketsAvailable: number;
  capacity?: number // maximum number of registrants
  registrationCount?: number // current number of registered users
  isRegistered?: boolean // whether current user is registered
}
