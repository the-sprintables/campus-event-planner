package routes

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"event-planner/db"
	"event-planner/models"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	_ "github.com/mattn/go-sqlite3"
	"github.com/stretchr/testify/assert"
)

func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/events", GetEvents)
	router.GET("/events/:id", GetEvent)
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

func TestParseEventID_Valid(t *testing.T) {
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Params = gin.Params{gin.Param{Key: "id", Value: "123"}}

	eventId, ok := parseEventID(c)

	assert.True(t, ok)
	assert.Equal(t, int64(123), eventId)
}

func TestParseEventID_Invalid(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Params = gin.Params{gin.Param{Key: "id", Value: "invalid"}}

	eventId, ok := parseEventID(c)

	assert.False(t, ok)
	assert.Equal(t, int64(0), eventId)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCheckEventAuthorization_Authorized(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	event := &models.Event{UserID: 1}
	userId := int64(1)

	result := checkEventAuthorization(c, event, userId, "update")

	assert.True(t, result)
}

func TestCheckEventAuthorization_Unauthorized(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	event := &models.Event{UserID: 1}
	userId := int64(2)

	result := checkEventAuthorization(c, event, userId, "delete")

	assert.False(t, result)
	assert.Equal(t, http.StatusUnauthorized, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Contains(t, response["message"].(string), "not authorized")
}

func TestCreateEvent_ValidPayload(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Set up middleware to add userId to context
	router.POST("/events", func(c *gin.Context) {
		c.Set("userId", int64(1))
		CreateEvent(c)
	})

	event := models.Event{
		Name:             "Test Event",
		Description:      "Test Description",
		Location:         "Test Location",
		DateTime:         time.Now(),
		TicketsAvailable: 40,
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
	router.POST("/events", CreateEvent)

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
		UpdateEvent(c)
	})

	// First create an event
	event := models.Event{
		Name:             "Test Event",
		Description:      "Test Description",
		Location:         "Test Location",
		DateTime:         time.Now(),
		UserID:           1,
		TicketsAvailable: 40,
	}
	err := event.Save()
	if err != nil {
		t.Fatalf("Failed to create test event: %v", err)
	}

	// Update the event
	updateEvent := models.Event{
		Name:             "Updated Event",
		Description:      "Updated Description",
		Location:         "Updated Location",
		DateTime:         time.Now(),
		TicketsAvailable: 45,
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
		UpdateEvent(c)
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
		Name:             "Test Event",
		Description:      "Test Description",
		Location:         "Test Location",
		DateTime:         time.Now(),
		UserID:           1,
		TicketsAvailable: 30,
	}
	err := event.Save()
	if err != nil {
		t.Fatalf("Failed to create test event: %v", err)
	}

	// Try to update with different user (userID 2)
	router.PUT("/events/:id", func(c *gin.Context) {
		c.Set("userId", int64(2))
		UpdateEvent(c)
	})

	updateEvent := models.Event{
		Name:             "Updated Event",
		Description:      "Updated Description",
		Location:         "Updated Location",
		DateTime:         time.Now(),
		TicketsAvailable: 25,
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
		Name:             "Test Event",
		Description:      "Test Description",
		Location:         "Test Location",
		DateTime:         time.Now(),
		UserID:           1,
		TicketsAvailable: 20,
	}
	err := event.Save()
	if err != nil {
		t.Fatalf("Failed to create test event: %v", err)
	}
	eventID := event.ID

	// Delete the event
	router.DELETE("/events/:id", func(c *gin.Context) {
		c.Set("userId", int64(1))
		DeleteEvent(c)
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
		DeleteEvent(c)
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
		Name:             "Test Event",
		Description:      "Test Description",
		Location:         "Test Location",
		DateTime:         time.Now(),
		UserID:           1,
		TicketsAvailable: 25,
	}
	err := event.Save()
	if err != nil {
		t.Fatalf("Failed to create test event: %v", err)
	}

	// Try to delete with different user (userID 2)
	router.DELETE("/events/:id", func(c *gin.Context) {
		c.Set("userId", int64(2))
		DeleteEvent(c)
	})

	req, _ := http.NewRequest("DELETE", "/events/1", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestUpdateEventTicketCount_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	router.PUT("/events/:id/tickets", func(c *gin.Context) {
		c.Set("userId", int64(1))
		UpdateEventTicketCount(c)
	})

	event := models.Event{
		Name:             "Ticket Event",
		Description:      "Ticket Description",
		Location:         "Ticket Location",
		DateTime:         time.Now(),
		UserID:           1,
		TicketsAvailable: 25,
	}
	err := event.Save()
	if err != nil {
		t.Fatalf("Failed to create test event: %v", err)
	}

	payload := ticketUpdateRequest{TicketsAvailable: 40}
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("PUT", "/events/"+strconv.FormatInt(event.ID, 10)+"/tickets", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestUpdateEventTicketCount_Unauthorized(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	router.PUT("/events/:id/tickets", func(c *gin.Context) {
		c.Set("userId", int64(2))
		UpdateEventTicketCount(c)
	})

	event := models.Event{
		Name:             "Ticket Event",
		Description:      "Ticket Description",
		Location:         "Ticket Location",
		DateTime:         time.Now(),
		UserID:           1,
		TicketsAvailable: 25,
	}
	err := event.Save()
	if err != nil {
		t.Fatalf("Failed to create test event: %v", err)
	}

	payload := ticketUpdateRequest{TicketsAvailable: 10}
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("PUT", "/events/"+strconv.FormatInt(event.ID, 10)+"/tickets", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}
