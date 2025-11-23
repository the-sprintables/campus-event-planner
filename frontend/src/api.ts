const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
export interface BackendEvent {
  ID: number;
  Name: string;
  Description: string;
  Location: string;
  DateTime: string; // ISO format datetime
  UserID: number;
  ImageData?: string;
  Color?: string;
  Price?: number;
  Priority?: string;
  eventType?: string; // Backend sends lowercase "eventType" in JSON
  TicketsAvailable?: number;
}

// Frontend Event type (from types.ts)
import { Event } from "./types";

// Helper function to check if backend is reachable
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/events`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    // Even if we get an error response, the server is reachable
    return true;
  } catch (error) {
    console.error("Backend health check failed:", error);
    return false;
  }
}

// Helper to get auth token from localStorage
function getAuthToken(): string | null {
  return localStorage.getItem("auth_token");
}

// Helper to set auth token
function setAuthToken(token: string): void {
  localStorage.setItem("auth_token", token);
}

// Helper to remove auth token
function removeAuthToken(): void {
  localStorage.removeItem("auth_token");
}

// Helper to handle API errors consistently
async function handleApiError(
  response: Response,
  defaultMessage: string
): Promise<string> {
  if (!response.ok) {
    try {
      const data = await response.json();
      return data.message || defaultMessage;
    } catch {
      return `Server returned ${response.status}: ${response.statusText}`;
    }
  }
  return defaultMessage;
}

// Helper to handle network errors consistently
function handleNetworkError(error: unknown, operation: string): string {
  const errorMessage =
    error instanceof Error
      ? `Network error: ${error.message}. Make sure the backend server is running on ${API_BASE_URL}`
      : `Network error: Could not ${operation} at ${API_BASE_URL}. Is the backend running?`;
  console.error(`${operation} error:`, error);
  return errorMessage;
}

// Transform backend event to frontend event
function backendToFrontendEvent(be: BackendEvent): Event {
  // Parse the DateTime string from backend
  const date = new Date(be.DateTime);
  // Format as YYYY-MM-DD for the date input
  const dateStr = date.toISOString().split("T")[0];

  return {
    id: be.ID.toString(),
    title: be.Name,
    description: be.Description,
    location: be.Location,
    date: dateStr,
    ownerEmail: undefined, // Backend doesn't store email, only UserID
    imageData: be.ImageData,
    color: be.Color,
    price: be.Price,
    priority:
      (be.Priority as "available" | "almost-full" | "full") || "available",
    // Parse eventType - can be comma-separated string or single string
    eventType: be.eventType ? (be.eventType.includes(',') ? be.eventType.split(',').map(t => t.trim()) : be.eventType) : undefined,
    ticketsAvailable: be.TicketsAvailable ?? 0,
    capacity: be.TicketsAvailable, // Map TicketsAvailable to capacity
  };
}

// Transform frontend event to backend event
function frontendToBackendEvent(
  fe: Event,
  userId?: number
): Partial<BackendEvent> {
  // Convert date string to ISO datetime string
  // If date is YYYY-MM-DD, convert to full datetime (use noon to avoid timezone issues)
  let dateTime: string;
  if (fe.date) {
    // Parse the date and set to noon UTC to avoid timezone issues
    const date = new Date(fe.date + "T12:00:00Z");
    dateTime = date.toISOString();
  } else {
    dateTime = new Date().toISOString();
  }

  // Ensure required fields are not undefined or empty
  // Backend requires Name, Description, Location to be non-empty strings
  const description = fe.description?.trim() || "";
  const location = fe.location?.trim() || "";
  const title = fe.title?.trim() || "";
  
  return {
    Name: title,
    Description: description,
    Location: location,
    DateTime: dateTime,
    UserID: userId || 0,
    ImageData: fe.imageData || "",
    Color: fe.color || "",
    Price: fe.price,
    Priority: fe.priority || "available",
    // Convert array to comma-separated string for backend
    // Backend expects lowercase "eventType" in JSON
    eventType: Array.isArray(fe.eventType) ? fe.eventType.join(',') : (fe.eventType || ''),
    TicketsAvailable: fe.ticketsAvailable ?? 0,
  };
}

// API functions

export async function register(
  email: string,
  password: string,
  name: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      const errorMessage = await handleApiError(
        response,
        "Registration failed"
      );
      return { ok: false, error: errorMessage };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: handleNetworkError(error, "connect to server") };
  }
}

export async function login(
  email: string,
  password: string
): Promise<{
  ok: boolean;
  token?: string;
  role?: string;
  email?: string;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorMessage = await handleApiError(response, "Login failed");
      return { ok: false, error: errorMessage };
    }

    const data = await response.json();
    if (data.token) {
      setAuthToken(data.token);
      return {
        ok: true,
        token: data.token,
        role: data.role || "user",
        email: data.email || email,
      };
    }

    return { ok: false, error: "No token received" };
  } catch (error) {
    return { ok: false, error: handleNetworkError(error, "connect to server") };
  }
}

export function logout(): void {
  removeAuthToken();
}

export function getAuthTokenFromStorage(): string | null {
  return getAuthToken();
}

export async function updatePassword(
  newPassword: string
): Promise<{ ok: boolean; error?: string }> {
  const token = getAuthToken();
  if (!token) {
    return { ok: false, error: "Not authenticated" };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/users/password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ newPassword }),
    });

    if (!response.ok) {
      const errorMessage = await handleApiError(
        response,
        "Failed to update password"
      );
      return { ok: false, error: errorMessage };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: handleNetworkError(error, "update password") };
  }
}

export interface UserProfile {
  id: number;
  email: string;
  name: string;
  role: string;
  preferredEventTypes: string[];
}

export async function getUserProfile(): Promise<{
  ok: boolean;
  profile?: UserProfile;
  error?: string;
}> {
  const token = getAuthToken();
  if (!token) {
    return { ok: false, error: "Not authenticated" };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorMessage = await handleApiError(
        response,
        "Failed to fetch profile"
      );
      return { ok: false, error: errorMessage };
    }

    const profile: UserProfile = await response.json();
    return { ok: true, profile };
  } catch (error) {
    return { ok: false, error: handleNetworkError(error, "fetch profile") };
  }
}

export async function updateUserProfile(
  name: string,
  preferredEventTypes: string[]
): Promise<{ ok: boolean; error?: string }> {
  const token = getAuthToken();
  if (!token) {
    return { ok: false, error: "Not authenticated" };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, preferredEventTypes }),
    });

    if (!response.ok) {
      const errorMessage = await handleApiError(
        response,
        "Failed to update profile"
      );
      return { ok: false, error: errorMessage };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: handleNetworkError(error, "update profile") };
  }
}

// Events API

export async function getEvents(): Promise<{
  ok: boolean;
  events?: Event[];
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/events`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorMessage = await handleApiError(
        response,
        "Failed to fetch events"
      );
      return { ok: false, error: errorMessage };
    }

    const backendEvents: BackendEvent[] = await response.json();
    // Handle null or undefined response
    if (!backendEvents || !Array.isArray(backendEvents)) {
      return { ok: true, events: [] };
    }
    const frontendEvents = backendEvents.map(backendToFrontendEvent);
    return { ok: true, events: frontendEvents };
  } catch (error) {
    return { ok: false, error: handleNetworkError(error, "fetch events") };
  }
}

export async function getEvent(
  id: string
): Promise<{ ok: boolean; event?: Event; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/events/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorMessage = await handleApiError(
        response,
        "Failed to fetch event"
      );
      return { ok: false, error: errorMessage };
    }

    const backendEvent: BackendEvent = await response.json();
    const frontendEvent = backendToFrontendEvent(backendEvent);
    return { ok: true, event: frontendEvent };
  } catch (error) {
    return { ok: false, error: handleNetworkError(error, "fetch event") };
  }
}

export async function createEvent(
  event: Event
): Promise<{ ok: boolean; event?: Event; error?: string }> {
  const token = getAuthToken();
  if (!token) {
    return { ok: false, error: "Not authenticated" };
  }

  try {
    const backendEvent = frontendToBackendEvent(event);
    
    // Create object with correct JSON field names for backend
    const requestBody: any = {
      Name: backendEvent.Name || "",
      Description: backendEvent.Description || "",
      Location: backendEvent.Location || "",
      DateTime: backendEvent.DateTime,
      UserID: backendEvent.UserID || 0,
      ImageData: backendEvent.ImageData || "",
      Color: backendEvent.Color || "",
      Priority: backendEvent.Priority || "available",
      TicketsAvailable: backendEvent.TicketsAvailable ?? 0,
      eventType: backendEvent.eventType || "", // Backend expects lowercase "eventType"
    };
    
    // Only include Price if it's defined (backend expects *float64, so null/undefined should be omitted)
    if (backendEvent.Price !== undefined && backendEvent.Price !== null) {
      requestBody.Price = backendEvent.Price;
    }

    const response = await fetch(`${API_BASE_URL}/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorMessage = await handleApiError(
        response,
        "Failed to create event"
      );
      return { ok: false, error: errorMessage };
    }

    const data = await response.json();
    if (data.event) {
      const frontendEvent = backendToFrontendEvent(data.event as BackendEvent);
      return { ok: true, event: frontendEvent };
    }

    const fetchResult = await getEvents();
    console.log('createEvent - fallback getEvents result:', fetchResult);
    if (fetchResult.ok && fetchResult.events && fetchResult.events.length > 0) {
      // Return the first event (assuming it's the newly created one)
      return { ok: true, event: fetchResult.events[0] };
    }
    console.log('createEvent - no event data received');
    return { ok: false, error: "No event data received" };
  } catch (error) {
    return { ok: false, error: handleNetworkError(error, "create event") };
  }
}

export async function updateEvent(
  id: string,
  event: Event
): Promise<{ ok: boolean; error?: string }> {
  const token = getAuthToken();
  if (!token) {
    return { ok: false, error: "Not authenticated" };
  }

  try {
    const backendEvent = frontendToBackendEvent(event);
    
    // Create object with correct JSON field names for backend
    // Backend expects all fields to match the Event struct exactly
    const requestBody: any = {
      Name: backendEvent.Name || "",
      Description: backendEvent.Description || "",
      Location: backendEvent.Location || "",
      DateTime: backendEvent.DateTime,
      UserID: backendEvent.UserID || 0, // Include UserID for binding (backend gets actual userId from token)
      ImageData: backendEvent.ImageData || "",
      Color: backendEvent.Color || "",
      Priority: backendEvent.Priority || "available",
      TicketsAvailable: backendEvent.TicketsAvailable ?? 0,
      eventType: backendEvent.eventType || "", // Backend expects lowercase "eventType"
    };
    
    // Only include Price if it's defined (backend expects *float64, so null/undefined should be omitted)
    if (backendEvent.Price !== undefined && backendEvent.Price !== null) {
      requestBody.Price = backendEvent.Price;
    }
    
    // Validate required fields before sending
    if (!requestBody.Name || !requestBody.Description || !requestBody.Location || !requestBody.DateTime) {
      console.error('Missing required fields:', {
        Name: requestBody.Name,
        Description: requestBody.Description,
        Location: requestBody.Location,
        DateTime: requestBody.DateTime
      });
      return { ok: false, error: "Missing required fields: Name, Description, Location, or DateTime" };
    }
    
    console.log('Update event request body:', JSON.stringify(requestBody, null, 2));
    console.log('Update event ID:', id);
    
    const response = await fetch(`${API_BASE_URL}/events/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      // Try to get more detailed error information
      let errorMessage = await handleApiError(
        response,
        "Failed to update event"
      );
      
      // Log response for debugging
      try {
        const errorData = await response.json();
        console.error('Update event error response:', errorData);
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        console.error('Could not parse error response');
      }
      
      return { ok: false, error: errorMessage };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: handleNetworkError(error, "update event") };
  }
}

export async function deleteEvent(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  const token = getAuthToken();
  if (!token) {
    return { ok: false, error: "Not authenticated" };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/events/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorMessage = await handleApiError(
        response,
        "Failed to delete event"
      );
      return { ok: false, error: errorMessage };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: handleNetworkError(error, "delete event") };
  }
}

// Event Registration API functions

export interface EventRegistrationResponse {
  message: string;
  eventId: string;
  userId?: string;
}

export async function registerForEvent(eventId: string): Promise<{ ok: boolean; data?: EventRegistrationResponse; error?: string }> {
  try {
    const token = getAuthToken();
    if (!token) {
      return { ok: false, error: 'Authentication required' };
    }

    const response = await fetch(`${API_BASE_URL}/events/${eventId}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorMessage = await handleApiError(response, 'Failed to register for event');
      return { ok: false, error: errorMessage };
    }

    const data = await response.json();
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: handleNetworkError(error, 'register for event') };
  }
}

export async function unregisterFromEvent(eventId: string): Promise<{ ok: boolean; data?: EventRegistrationResponse; error?: string }> {
  try {
    const token = getAuthToken();
    if (!token) {
      return { ok: false, error: 'Authentication required' };
    }

    const response = await fetch(`${API_BASE_URL}/events/${eventId}/register`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorMessage = await handleApiError(response, 'Failed to unregister from event');
      return { ok: false, error: errorMessage };
    }

    const data = await response.json();
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: handleNetworkError(error, 'unregister from event') };
  }
}

export async function checkEventRegistration(eventId: string): Promise<{ ok: boolean; data?: { isRegistered: boolean }; error?: string }> {
  try {
    const token = getAuthToken();
    if (!token) {
      return { ok: false, error: 'Authentication required' };
    }

    const response = await fetch(`${API_BASE_URL}/events/${eventId}/registration/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorMessage = await handleApiError(response, 'Failed to check registration status');
      return { ok: false, error: errorMessage };
    }

    const data = await response.json();
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: handleNetworkError(error, 'check registration status') };
  }
}

export async function getEventRegistrationCount(eventId: string): Promise<{ ok: boolean; data?: { count: number; capacity?: number }; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/registrations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorMessage = await handleApiError(response, 'Failed to get registration count');
      return { ok: false, error: errorMessage };
    }

    const data = await response.json();
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: handleNetworkError(error, 'get registration count') };
  }
}

