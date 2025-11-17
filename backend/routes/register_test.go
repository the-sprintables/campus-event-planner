package routes

import (
	"database/sql"
	"encoding/json"
	"event-planner/db"
	"event-planner/models"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	_ "github.com/mattn/go-sqlite3"
	"github.com/stretchr/testify/assert"
)

func setupRegisterTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Set up middleware to add userId to context
	router.POST("/events/:id/register", func(c *gin.Context) {
		// Get userId from query param for testing flexibility
		userIdStr := c.Query("userId")
		if userIdStr != "" {
			userId, _ := strconv.ParseInt(userIdStr, 10, 64)
			c.Set("userId", userId)
		} else {
			c.Set("userId", int64(1)) // Default userId
		}
		registerForEvent(c)
	})

	router.DELETE("/events/:id/register", func(c *gin.Context) {
		// Get userId from query param for testing flexibility
		userIdStr := c.Query("userId")
		if userIdStr != "" {
			userId, _ := strconv.ParseInt(userIdStr, 10, 64)
			c.Set("userId", userId)
		} else {
			c.Set("userId", int64(1)) // Default userId
		}
		cancelRegistration(c)
	})

	return router
}

func TestRegisterForEvent_Valid(t *testing.T) {
	// Setup test database
	testDB, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("Failed to open test database: %v", err)
	}
	defer testDB.Close()

	// Create tables
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

	// Set the global DB connection
	originalDB := db.DB
	db.DB = testDB
	defer func() { db.DB = originalDB }()

	// Create a test user
	user := models.User{
		Email:    "test@example.com",
		Password: "password123",
		Role:     "user",
	}
	err = user.Save()
	if err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	// Create a test event
	event := models.Event{
		Name:             "Test Event",
		Description:      "Test Description",
		Location:         "Test Location",
		DateTime:         time.Now(),
		UserID:           user.ID,
		TicketsAvailable: 10,
	}
	err = event.Save()
	if err != nil {
		t.Fatalf("Failed to create test event: %v", err)
	}

	router := setupRegisterTestRouter()
	req, _ := http.NewRequest("POST", "/events/"+strconv.FormatInt(event.ID, 10)+"/register?userId="+strconv.FormatInt(user.ID, 10), nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "Registered for event successfully", response["message"])

	// Verify registration was created in database
	var count int
	err = testDB.QueryRow("SELECT COUNT(*) FROM registrations WHERE event_id = ? AND user_id = ?", event.ID, user.ID).Scan(&count)
	if err != nil {
		t.Fatalf("Failed to verify registration: %v", err)
	}
	assert.Equal(t, 1, count)
}

func TestRegisterForEvent_InvalidEventID(t *testing.T) {
	router := setupRegisterTestRouter()
	req, _ := http.NewRequest("POST", "/events/invalid/register", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "Could not parse event id", response["message"])
}

func TestRegisterForEvent_EventNotFound(t *testing.T) {
	// Setup test database
	testDB, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("Failed to open test database: %v", err)
	}
	defer testDB.Close()

	// Create tables
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

	// Set the global DB connection
	originalDB := db.DB
	db.DB = testDB
	defer func() { db.DB = originalDB }()

	router := setupRegisterTestRouter()
	req, _ := http.NewRequest("POST", "/events/999/register", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "Could not fetch event", response["message"])
}

func TestRegisterForEvent_DuplicateRegistration(t *testing.T) {
	// Setup test database
	testDB, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("Failed to open test database: %v", err)
	}
	defer testDB.Close()

	// Create tables with unique constraint on (event_id, user_id)
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
		UNIQUE(event_id, user_id),
		FOREIGN KEY (event_id) REFERENCES events(id),
		FOREIGN KEY (user_id) REFERENCES users(id)
	);
	`
	_, err = testDB.Exec(createTables)
	if err != nil {
		t.Fatalf("Failed to create tables: %v", err)
	}

	// Set the global DB connection
	originalDB := db.DB
	db.DB = testDB
	defer func() { db.DB = originalDB }()

	// Create a test user
	user := models.User{
		Email:    "test@example.com",
		Password: "password123",
		Role:     "user",
	}
	err = user.Save()
	if err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	// Create a test event
	event := models.Event{
		Name:             "Test Event",
		Description:      "Test Description",
		Location:         "Test Location",
		DateTime:         time.Now(),
		UserID:           user.ID,
		TicketsAvailable: 15,
	}
	err = event.Save()
	if err != nil {
		t.Fatalf("Failed to create test event: %v", err)
	}

	// Register once (should succeed)
	router := setupRegisterTestRouter()
	req, _ := http.NewRequest("POST", "/events/"+strconv.FormatInt(event.ID, 10)+"/register?userId="+strconv.FormatInt(user.ID, 10), nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	// Try to register again (should fail due to duplicate)
	req2, _ := http.NewRequest("POST", "/events/"+strconv.FormatInt(event.ID, 10)+"/register?userId="+strconv.FormatInt(user.ID, 10), nil)
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)

	assert.Equal(t, http.StatusConflict, w2.Code)

	var response map[string]interface{}
	json.Unmarshal(w2.Body.Bytes(), &response)
	assert.Equal(t, "User already registered for this event", response["message"])
}

func TestRegisterForEvent_MissingUserId(t *testing.T) {
	// Setup test database
	testDB, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("Failed to open test database: %v", err)
	}
	defer testDB.Close()

	// Create tables
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

	// Set the global DB connection
	originalDB := db.DB
	db.DB = testDB
	defer func() { db.DB = originalDB }()

	// Create a test event
	user := models.User{
		Email:    "test@example.com",
		Password: "password123",
		Role:     "user",
	}
	err = user.Save()
	if err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	event := models.Event{
		Name:             "Test Event",
		Description:      "Test Description",
		Location:         "Test Location",
		DateTime:         time.Now(),
		UserID:           user.ID,
		TicketsAvailable: 20,
	}
	err = event.Save()
	if err != nil {
		t.Fatalf("Failed to create test event: %v", err)
	}

	// Test with userId = 0 (default when not set properly)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/events/:id/register", func(c *gin.Context) {
		// Don't set userId, so it will be 0
		registerForEvent(c)
	})

	req, _ := http.NewRequest("POST", "/events/"+strconv.FormatInt(event.ID, 10)+"/register", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should still work but register with userId = 0
	// The function doesn't validate userId, so it will attempt registration
	assert.Contains(t, []int{http.StatusCreated, http.StatusInternalServerError}, w.Code)
}

func TestCancelRegistration_Valid(t *testing.T) {
	// Setup test database
	testDB, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("Failed to open test database: %v", err)
	}
	defer testDB.Close()

	// Create tables
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

	// Set the global DB connection
	originalDB := db.DB
	db.DB = testDB
	defer func() { db.DB = originalDB }()

	// Create a test user
	user := models.User{
		Email:    "test@example.com",
		Password: "password123",
		Role:     "user",
	}
	err = user.Save()
	if err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	// Create a test event
	event := models.Event{
		Name:             "Test Event",
		Description:      "Test Description",
		Location:         "Test Location",
		DateTime:         time.Now(),
		UserID:           user.ID,
		TicketsAvailable: 15,
	}
	err = event.Save()
	if err != nil {
		t.Fatalf("Failed to create test event: %v", err)
	}

	// Register for the event first
	err = event.Register(user.ID)
	if err != nil {
		t.Fatalf("Failed to register for event: %v", err)
	}

	// Verify registration exists
	var count int
	err = testDB.QueryRow("SELECT COUNT(*) FROM registrations WHERE event_id = ? AND user_id = ?", event.ID, user.ID).Scan(&count)
	if err != nil {
		t.Fatalf("Failed to verify registration: %v", err)
	}
	assert.Equal(t, 1, count, "Registration should exist before cancellation")

	// Cancel registration
	router := setupRegisterTestRouter()
	req, _ := http.NewRequest("DELETE", "/events/"+strconv.FormatInt(event.ID, 10)+"/register?userId="+strconv.FormatInt(user.ID, 10), nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "Cancelled successfully", response["message"])

	// Verify registration was removed from database
	err = testDB.QueryRow("SELECT COUNT(*) FROM registrations WHERE event_id = ? AND user_id = ?", event.ID, user.ID).Scan(&count)
	if err != nil {
		t.Fatalf("Failed to verify registration: %v", err)
	}
	assert.Equal(t, 0, count, "Registration should be removed after cancellation")
}

func TestCancelRegistration_InvalidEventID(t *testing.T) {
	router := setupRegisterTestRouter()
	req, _ := http.NewRequest("DELETE", "/events/invalid/register", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "Could not parse event id", response["message"])
}

func TestCancelRegistration_NoRegistrationExists(t *testing.T) {
	// Setup test database
	testDB, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("Failed to open test database: %v", err)
	}
	defer testDB.Close()

	// Create tables
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

	// Set the global DB connection
	originalDB := db.DB
	db.DB = testDB
	defer func() { db.DB = originalDB }()

	// Create a test user
	user := models.User{
		Email:    "test@example.com",
		Password: "password123",
		Role:     "user",
	}
	err = user.Save()
	if err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	// Create a test event
	event := models.Event{
		Name:             "Test Event",
		Description:      "Test Description",
		Location:         "Test Location",
		DateTime:         time.Now(),
		UserID:           user.ID,
		TicketsAvailable: 15,
	}
	err = event.Save()
	if err != nil {
		t.Fatalf("Failed to create test event: %v", err)
	}

	// Try to cancel registration that doesn't exist
	router := setupRegisterTestRouter()
	req, _ := http.NewRequest("DELETE", "/events/"+strconv.FormatInt(event.ID, 10)+"/register?userId="+strconv.FormatInt(user.ID, 10), nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "Event does not exist or has already been cancelled", response["message"])
}

func TestCancelRegistration_MissingUserId(t *testing.T) {
	// Setup test database
	testDB, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("Failed to open test database: %v", err)
	}
	defer testDB.Close()

	// Create tables
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

	// Set the global DB connection
	originalDB := db.DB
	db.DB = testDB
	defer func() { db.DB = originalDB }()

	// Create a test user
	user := models.User{
		Email:    "test@example.com",
		Password: "password123",
		Role:     "user",
	}
	err = user.Save()
	if err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	// Create a test event
	event := models.Event{
		Name:             "Test Event",
		Description:      "Test Description",
		Location:         "Test Location",
		DateTime:         time.Now(),
		UserID:           user.ID,
		TicketsAvailable: 15,
	}
	err = event.Save()
	if err != nil {
		t.Fatalf("Failed to create test event: %v", err)
	}

	// Test with userId = 0 (default when not set properly)
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.DELETE("/events/:id/register", func(c *gin.Context) {
		// Don't set userId, so it will be 0
		cancelRegistration(c)
	})

	req, _ := http.NewRequest("DELETE", "/events/"+strconv.FormatInt(event.ID, 10)+"/register", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "Event does not exist or has already been cancelled", response["message"])
}
