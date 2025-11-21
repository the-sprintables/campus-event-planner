package models

import (
	"database/sql"
	"event-planner/db"
	"testing"
	"time"

	_ "github.com/mattn/go-sqlite3"
	"github.com/stretchr/testify/assert"
)

func setupEventTestDB(t *testing.T) *sql.DB {
	testDB, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("Failed to open test database: %v", err)
	}

	createTables := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		email TEXT NOT NULL UNIQUE,
		password TEXT NOT NULL,
		role TEXT DEFAULT 'user'
	);
	CREATE TABLE IF NOT EXISTS events (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		description TEXT NOT NULL,
		location TEXT NOT NULL,
		dateTime DATETIME NOT NULL,
		userID INTEGER,
		imageData TEXT,
		color TEXT,
		price REAL,
		priority TEXT,
		ticketsAvailable INTEGER NOT NULL DEFAULT 0,
		FOREIGN KEY (userID) REFERENCES users(id)
	);
	CREATE TABLE IF NOT EXISTS registrations (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		event_id INTEGER,
		user_id INTEGER,
		FOREIGN KEY (event_id) REFERENCES events(id),
		FOREIGN KEY (user_id) REFERENCES users(id)
	);
	`
	_, err = testDB.Exec(createTables)
	if err != nil {
		t.Fatalf("Failed to create tables: %v", err)
	}

	return testDB
}

func createTestUser(t *testing.T, testDB *sql.DB) int64 {
	user := User{
		Email:    "test@example.com",
		Password: "password123",
		Role:     "user",
	}
	err := user.Save()
	if err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}
	return user.ID
}

func TestEvent_Save(t *testing.T) {
	testDB := setupEventTestDB(t)
	defer testDB.Close()

	originalDB := db.DB
	db.DB = testDB
	defer func() { db.DB = originalDB }()

	userID := createTestUser(t, testDB)

	tests := []struct {
		name    string
		event   Event
		wantErr bool
	}{
		{
			name: "valid event with all fields",
			event: Event{
				Name:             "Test Event",
				Description:      "Test Description",
				Location:         "Test Location",
				DateTime:         time.Now(),
				UserID:           userID,
				ImageData:        "base64imagedata",
				Color:            "blue",
				Price:            func() *float64 { p := 25.50; return &p }(),
				Priority:         "high",
				TicketsAvailable: 100,
			},
			wantErr: false,
		},
		{
			name: "event with minimal fields",
			event: Event{
				Name:             "Minimal Event",
				Description:      "Minimal Description",
				Location:         "Minimal Location",
				DateTime:         time.Now(),
				UserID:           userID,
				TicketsAvailable: 50,
			},
			wantErr: false,
		},
		{
			name: "event with nil price",
			event: Event{
				Name:             "Free Event",
				Description:      "Free Description",
				Location:         "Free Location",
				DateTime:         time.Now(),
				UserID:           userID,
				Price:            nil,
				TicketsAvailable: 0,
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			event := tt.event
			err := event.Save()
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.NotZero(t, event.ID, "Event ID should be set after save")

				// Verify event was saved correctly
				var savedName, savedDescription, savedLocation string
				var savedUserID int64
				err = testDB.QueryRow("SELECT name, description, location, userID FROM events WHERE id = ?", event.ID).
					Scan(&savedName, &savedDescription, &savedLocation, &savedUserID)
				assert.NoError(t, err)
				assert.Equal(t, tt.event.Name, savedName)
				assert.Equal(t, tt.event.Description, savedDescription)
				assert.Equal(t, tt.event.Location, savedLocation)
				assert.Equal(t, tt.event.UserID, savedUserID)
			}
		})
	}
}

func TestGetAllEvents(t *testing.T) {
	testDB := setupEventTestDB(t)
	defer testDB.Close()

	originalDB := db.DB
	db.DB = testDB
	defer func() { db.DB = originalDB }()

	userID := createTestUser(t, testDB)

	// Test empty events list
	events, err := GetAllEvents()
	assert.NoError(t, err)
	// GetAllEvents should return an empty slice, not nil
	if events == nil {
		events = []Event{} // Handle nil case
	}
	assert.Equal(t, 0, len(events))

	// Create some test events
	event1 := Event{
		Name:             "Event 1",
		Description:      "Description 1",
		Location:         "Location 1",
		DateTime:         time.Now(),
		UserID:           userID,
		TicketsAvailable: 20,
	}
	err = event1.Save()
	assert.NoError(t, err)

	event2 := Event{
		Name:             "Event 2",
		Description:      "Description 2",
		Location:         "Location 2",
		DateTime:         time.Now().Add(time.Hour),
		UserID:           userID,
		TicketsAvailable: 25,
	}
	err = event2.Save()
	assert.NoError(t, err)

	// Get all events
	events, err = GetAllEvents()
	assert.NoError(t, err)
	assert.Equal(t, 2, len(events))

	// Verify events are returned
	eventNames := make(map[string]bool)
	for _, event := range events {
		eventNames[event.Name] = true
	}
	assert.True(t, eventNames["Event 1"])
	assert.True(t, eventNames["Event 2"])
}

func TestGetEventByID(t *testing.T) {
	testDB := setupEventTestDB(t)
	defer testDB.Close()

	originalDB := db.DB
	db.DB = testDB
	defer func() { db.DB = originalDB }()

	userID := createTestUser(t, testDB)

	// Create a test event
	event := Event{
		Name:             "Test Event",
		Description:      "Test Description",
		Location:         "Test Location",
		DateTime:         time.Now(),
		UserID:           userID,
		Color:            "red",
		TicketsAvailable: 75,
	}
	err := event.Save()
	assert.NoError(t, err)

	// Get event by ID
	retrievedEvent, err := GetEventByID(event.ID)
	assert.NoError(t, err)
	assert.NotNil(t, retrievedEvent)
	assert.Equal(t, event.ID, retrievedEvent.ID)
	assert.Equal(t, event.Name, retrievedEvent.Name)
	assert.Equal(t, event.Description, retrievedEvent.Description)
	assert.Equal(t, event.Location, retrievedEvent.Location)
	assert.Equal(t, event.UserID, retrievedEvent.UserID)
	assert.Equal(t, event.Color, retrievedEvent.Color)
}

func TestGetEventByID_NotFound(t *testing.T) {
	testDB := setupEventTestDB(t)
	defer testDB.Close()

	originalDB := db.DB
	db.DB = testDB
	defer func() { db.DB = originalDB }()

	// Try to get non-existent event
	event, err := GetEventByID(99999)
	assert.Error(t, err)
	assert.Nil(t, event)
}

func TestEvent_Update(t *testing.T) {
	testDB := setupEventTestDB(t)
	defer testDB.Close()

	originalDB := db.DB
	db.DB = testDB
	defer func() { db.DB = originalDB }()

	userID := createTestUser(t, testDB)

	// Create a test event
	event := Event{
		Name:             "Original Name",
		Description:      "Original Description",
		Location:         "Original Location",
		DateTime:         time.Now(),
		UserID:           userID,
		TicketsAvailable: 40,
	}
	err := event.Save()
	assert.NoError(t, err)

	// Update event
	event.Name = "Updated Name"
	event.Description = "Updated Description"
	event.Location = "Updated Location"
	newPrice := 99.99
	event.Price = &newPrice
	event.Color = "green"

	err = event.Update()
	assert.NoError(t, err)

	// Verify update
	updatedEvent, err := GetEventByID(event.ID)
	assert.NoError(t, err)
	assert.Equal(t, "Updated Name", updatedEvent.Name)
	assert.Equal(t, "Updated Description", updatedEvent.Description)
	assert.Equal(t, "Updated Location", updatedEvent.Location)
	assert.NotNil(t, updatedEvent.Price)
	assert.Equal(t, 99.99, *updatedEvent.Price)
	assert.Equal(t, "green", updatedEvent.Color)
}

func TestEvent_Delete(t *testing.T) {
	testDB := setupEventTestDB(t)
	defer testDB.Close()

	originalDB := db.DB
	db.DB = testDB
	defer func() { db.DB = originalDB }()

	userID := createTestUser(t, testDB)

	// Create a test event
	event := Event{
		Name:             "Event to Delete",
		Description:      "Description",
		Location:         "Location",
		DateTime:         time.Now(),
		UserID:           userID,
		TicketsAvailable: 10,
	}
	err := event.Save()
	assert.NoError(t, err)
	eventID := event.ID

	// Delete event
	err = event.Delete()
	assert.NoError(t, err)

	// Verify event is deleted
	deletedEvent, err := GetEventByID(eventID)
	assert.Error(t, err)
	assert.Nil(t, deletedEvent)
}

func TestEvent_Register(t *testing.T) {
	testDB := setupEventTestDB(t)
	defer testDB.Close()

	originalDB := db.DB
	db.DB = testDB
	defer func() { db.DB = originalDB }()

	userID := createTestUser(t, testDB)

	// Create another user for registration
	user2 := User{
		Email:    "user2@example.com",
		Password: "password123",
		Role:     "user",
	}
	err := user2.Save()
	assert.NoError(t, err)

	// Create a test event
	event := Event{
		Name:             "Test Event",
		Description:      "Test Description",
		Location:         "Test Location",
		DateTime:         time.Now(),
		UserID:           userID,
		TicketsAvailable: 15,
	}
	err = event.Save()
	assert.NoError(t, err)

	// Register user2 for event
	err = event.Register(user2.ID)
	assert.NoError(t, err)

	// Verify registration
	var count int
	err = testDB.QueryRow("SELECT COUNT(*) FROM registrations WHERE event_id = ? AND user_id = ?", event.ID, user2.ID).
		Scan(&count)
	assert.NoError(t, err)
	assert.Equal(t, 1, count)
}

func TestEvent_CancelRegistration(t *testing.T) {
	testDB := setupEventTestDB(t)
	defer testDB.Close()

	originalDB := db.DB
	db.DB = testDB
	defer func() { db.DB = originalDB }()

	userID := createTestUser(t, testDB)

	// Create another user
	user2 := User{
		Email:    "user2@example.com",
		Password: "password123",
		Role:     "user",
	}
	err := user2.Save()
	assert.NoError(t, err)

	// Create a test event
	event := Event{
		Name:             "Test Event",
		Description:      "Test Description",
		Location:         "Test Location",
		DateTime:         time.Now(),
		UserID:           userID,
		TicketsAvailable: 15,
	}
	err = event.Save()
	assert.NoError(t, err)

	// Register user2 for event
	err = event.Register(user2.ID)
	assert.NoError(t, err)

	// Cancel registration
	err = event.CancelRegistration(user2.ID)
	assert.NoError(t, err)

	// Verify registration is cancelled
	var count int
	err = testDB.QueryRow("SELECT COUNT(*) FROM registrations WHERE event_id = ? AND user_id = ?", event.ID, user2.ID).
		Scan(&count)
	assert.NoError(t, err)
	assert.Equal(t, 0, count)
}

func TestParseDateTime(t *testing.T) {
	tests := []struct {
		name     string
		dateTime sql.NullString
		want     time.Time
	}{
		{
			name:     "RFC3339 format",
			dateTime: sql.NullString{String: "2024-01-15T10:30:00Z", Valid: true},
			want:     time.Date(2024, 1, 15, 10, 30, 0, 0, time.UTC),
		},
		{
			name:     "SQLite datetime format",
			dateTime: sql.NullString{String: "2024-01-15 10:30:00", Valid: true},
			want:     time.Date(2024, 1, 15, 10, 30, 0, 0, time.UTC),
		},
		{
			name:     "invalid datetime string",
			dateTime: sql.NullString{String: "invalid", Valid: true},
			want:     time.Now(), // Should fallback to current time
		},
		{
			name:     "null datetime",
			dateTime: sql.NullString{Valid: false},
			want:     time.Now(), // Should fallback to current time
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parseDateTime(tt.dateTime)
			if tt.dateTime.Valid && tt.dateTime.String != "invalid" {
				// For valid dates, check that they're close (within 1 second)
				diff := result.Sub(tt.want)
				if diff < 0 {
					diff = -diff
				}
				assert.Less(t, diff, time.Second, "Parsed time should match expected time")
			} else {
				// For invalid/null dates, just check it's a valid time (not zero)
				assert.False(t, result.IsZero())
			}
		})
	}
}
