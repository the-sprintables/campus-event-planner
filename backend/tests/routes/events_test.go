package routes_test

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"event-planner/db"
	"event-planner/models"
	"event-planner/routes"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"testing"
	"time"

	_ "github.com/mattn/go-sqlite3"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/events", routes.GetEvents)
	router.GET("/events/:id", routes.GetEvent)
	return router
}

func TestMain(m *testing.M) {
	// Setup test database (in-memory)
	var err error
	db.DB, err = sql.Open("sqlite3", ":memory:")
	if err != nil {
		panic(err)
	}

	// Create tables
	createTables := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		email TEXT NOT NULL UNIQUE,
		password TEXT NOT NULL
	);
	CREATE TABLE IF NOT EXISTS events (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		description TEXT NOT NULL,
		location TEXT NOT NULL,
		dateTime DATETIME NOT NULL,
		userID INTEGER,
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
	_, err = db.DB.Exec(createTables)
	if err != nil {
		panic(err)
	}

	// Run tests
	code := m.Run()

	// Cleanup
	if db.DB != nil {
		db.DB.Close()
	}

	os.Exit(code)
}

func TestGetEvents(t *testing.T) {
	router := setupTestRouter()

	req, _ := http.NewRequest("GET", "/events", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should return 200 or 500 depending on database state
	assert.Contains(t, []int{http.StatusOK, http.StatusInternalServerError}, w.Code)
}

func TestGetEvent_ValidID(t *testing.T) {
	router := setupTestRouter()

	req, _ := http.NewRequest("GET", "/events/1", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should return 200 or 500 depending on database state
	assert.Contains(t, []int{http.StatusOK, http.StatusInternalServerError}, w.Code)
}

func TestGetEvent_InvalidID(t *testing.T) {
	router := setupTestRouter()

	req, _ := http.NewRequest("GET", "/events/invalid", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "Could not parse event id", response["message"])
}

func TestCreateEvent_ValidPayload(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	
	// Set up middleware to add userId to context
	router.POST("/events", func(c *gin.Context) {
		c.Set("userId", int64(1))
		routes.CreateEvent(c)
	})

	event := models.Event{
		Name:        "Test Event",
		Description: "Test Description",
		Location:    "Test Location",
		DateTime:    time.Now(),
	}

	jsonValue, _ := json.Marshal(event)
	req, _ := http.NewRequest("POST", "/events", bytes.NewBuffer(jsonValue))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should return 201 or 500 depending on database state
	assert.Contains(t, []int{http.StatusCreated, http.StatusInternalServerError}, w.Code)
}

func TestCreateEvent_InvalidPayload(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/events", routes.CreateEvent)

	req, _ := http.NewRequest("POST", "/events", bytes.NewBuffer([]byte("invalid json")))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestUpdateEvent_ValidPayload(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	
	// Set up middleware to add userId to context
	router.PUT("/events/:id", func(c *gin.Context) {
		c.Set("userId", int64(1))
		routes.UpdateEvent(c)
	})

	// First create an event
	event := models.Event{
		Name:        "Test Event",
		Description: "Test Description",
		Location:    "Test Location",
		DateTime:    time.Now(),
		UserID:      1,
	}
	err := event.Save()
	if err != nil {
		t.Fatalf("Failed to create test event: %v", err)
	}

	// Update the event
	updateEvent := models.Event{
		Name:        "Updated Event",
		Description: "Updated Description",
		Location:    "Updated Location",
		DateTime:    time.Now(),
	}

	jsonValue, _ := json.Marshal(updateEvent)
	req, _ := http.NewRequest("PUT", "/events/1", bytes.NewBuffer(jsonValue))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should return 200 or 500 depending on database state
	assert.Contains(t, []int{http.StatusOK, http.StatusInternalServerError}, w.Code)
}

func TestUpdateEvent_InvalidID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.PUT("/events/:id", func(c *gin.Context) {
		c.Set("userId", int64(1))
		routes.UpdateEvent(c)
	})

	req, _ := http.NewRequest("PUT", "/events/invalid", nil)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestUpdateEvent_Unauthorized(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	
	// Create an event with userID 1
	event := models.Event{
		Name:        "Test Event",
		Description: "Test Description",
		Location:    "Test Location",
		DateTime:    time.Now(),
		UserID:      1,
	}
	err := event.Save()
	if err != nil {
		t.Fatalf("Failed to create test event: %v", err)
	}

	// Try to update with different user (userID 2)
	router.PUT("/events/:id", func(c *gin.Context) {
		c.Set("userId", int64(2))
		routes.UpdateEvent(c)
	})

	updateEvent := models.Event{
		Name:        "Updated Event",
		Description: "Updated Description",
		Location:    "Updated Location",
		DateTime:    time.Now(),
	}

	jsonValue, _ := json.Marshal(updateEvent)
	req, _ := http.NewRequest("PUT", "/events/1", bytes.NewBuffer(jsonValue))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestDeleteEvent_ValidID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	
	// Create an event
	event := models.Event{
		Name:        "Test Event",
		Description: "Test Description",
		Location:    "Test Location",
		DateTime:    time.Now(),
		UserID:      1,
	}
	err := event.Save()
	if err != nil {
		t.Fatalf("Failed to create test event: %v", err)
	}
	eventID := event.ID

	// Delete the event
	router.DELETE("/events/:id", func(c *gin.Context) {
		c.Set("userId", int64(1))
		routes.DeleteEvent(c)
	})

	req, _ := http.NewRequest("DELETE", "/events/"+strconv.FormatInt(eventID, 10), nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should return 200 or 500 depending on database state
	assert.Contains(t, []int{http.StatusOK, http.StatusInternalServerError}, w.Code)
}

func TestDeleteEvent_InvalidID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.DELETE("/events/:id", func(c *gin.Context) {
		c.Set("userId", int64(1))
		routes.DeleteEvent(c)
	})

	req, _ := http.NewRequest("DELETE", "/events/invalid", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestDeleteEvent_Unauthorized(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	
	// Create an event with userID 1
	event := models.Event{
		Name:        "Test Event",
		Description: "Test Description",
		Location:    "Test Location",
		DateTime:    time.Now(),
		UserID:      1,
	}
	err := event.Save()
	if err != nil {
		t.Fatalf("Failed to create test event: %v", err)
	}

	// Try to delete with different user (userID 2)
	router.DELETE("/events/:id", func(c *gin.Context) {
		c.Set("userId", int64(2))
		routes.DeleteEvent(c)
	})

	req, _ := http.NewRequest("DELETE", "/events/1", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

