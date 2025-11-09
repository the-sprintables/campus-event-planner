# Frontend-Backend Integration Guide

## Quick Start

### 1. Start the Backend Server

```bash
cd backend
go mod tidy  # Install dependencies if needed
go run .     # Starts server on http://localhost:8080
```

You should see output like:
```
[GIN-debug] Listening and serving HTTP on :8080
```

### 2. Start the Frontend Development Server

In a **new terminal**:

```bash
cd frontend
npm install  # Install dependencies if needed
npm run dev   # Starts dev server on http://localhost:5173
```

### 3. Access the Application

Open your browser to: `http://localhost:5173`

## Troubleshooting "Network error: Could not connect to server"

### Common Issues:

1. **Backend server is not running**
   - ✅ **Solution**: Make sure the backend is running on port 8080
   - Check: Open `http://localhost:8080/events` in your browser - you should get a JSON response (even if empty array)

2. **Backend server crashed**
   - ✅ **Solution**: Check the backend terminal for error messages
   - Common causes:
     - Database file permissions issue
     - Port 8080 already in use
     - Missing dependencies

3. **Port conflict**
   - ✅ **Solution**: If port 8080 is in use, you can:
     - Change backend port in `backend/main.go` (line 28)
     - Update frontend API URL in `frontend/src/api.ts` (line 4) or use environment variable

4. **CORS issues**
   - ✅ **Solution**: Backend CORS is already configured for `http://localhost:5173`
   - If using a different port, update `backend/main.go` (line 18)

5. **Database initialization error**
   - ✅ **Solution**: Make sure the `backend` directory has write permissions
   - The backend creates `api.db` SQLite file in the `backend` directory

### Verify Backend is Running

Test the backend API directly:

```bash
# Test GET /events endpoint
curl http://localhost:8080/events

# Test POST /signup endpoint
curl -X POST http://localhost:8080/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

If these commands work, the backend is running correctly.

### Environment Variables

You can configure the API URL using environment variables:

Create a `.env` file in the `frontend` directory:

```env
VITE_API_BASE_URL=http://localhost:8080
```

Or set it when running:

```bash
VITE_API_BASE_URL=http://localhost:8080 npm run dev
```

## API Endpoints

- `GET /events` - Get all events (no auth required)
- `GET /events/:id` - Get event by ID (no auth required)
- `POST /events` - Create event (requires authentication)
- `PUT /events/:id` - Update event (requires authentication)
- `DELETE /events/:id` - Delete event (requires authentication)
- `POST /signup` - Register new user
- `POST /login` - Login and get JWT token

## Testing the Integration

1. **Register a new user**:
   - Go to `/register`
   - Enter email and password
   - Submit

2. **Login**:
   - Go to `/login`
   - Enter credentials
   - Select role (admin/user)
   - Submit

3. **View events**:
   - After login, you'll see the events page
   - Events are fetched from the backend

4. **Create event** (admin only):
   - Go to `/manage`
   - Fill in event details
   - Submit

## Debugging Tips

1. **Check browser console** for detailed error messages
2. **Check backend terminal** for server logs
3. **Check Network tab** in browser DevTools to see API requests/responses
4. **Verify JWT token** is stored in localStorage (DevTools → Application → Local Storage)

## Common Error Messages

- **"Network error: Could not connect to server"**
  - Backend is not running or not accessible
  - Check backend terminal for errors

- **"Invalid/No authorization token"**
  - Token expired or invalid
  - Try logging in again

- **"You are not authorized to update/delete this event"**
  - You can only modify events you created
  - Check that you're logged in as the event creator

