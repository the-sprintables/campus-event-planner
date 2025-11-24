package routes

import (
	"bytes"
	"encoding/json"
	"event-planner/middlewares"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// setupE2ETestRouter creates a full router with all routes and middleware
func setupE2ETestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Setup CORS (simplified for testing)
	router.Use(cors.New(cors.Config{
		AllowOriginFunc: func(origin string) bool { return true },
		AllowMethods:     []string{"POST", "GET", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	// Public routes
	router.GET("/events", GetEvents)
	router.GET("/events/:id", GetEvent)
	router.POST("/signup", signup)
	router.POST("/login", login)

	// Authenticated routes
	authenticated := router.Group("/")
	authenticated.Use(middlewares.Authenticate)
	authenticated.POST("/events", CreateEvent)
	authenticated.GET("/events/:id/registration/status", getRegistrationStatus)
	authenticated.POST("/events/:id/register", registerForEvent)
	authenticated.DELETE("/events/:id/register", cancelRegistration)
	authenticated.PUT("/events/:id/tickets", UpdateEventTicketCount)
	authenticated.PUT("/events/:id", UpdateEvent)
	authenticated.DELETE("/events/:id", DeleteEvent)
	authenticated.GET("/users/profile", getProfile)
	authenticated.PUT("/users/profile", updateProfile)
	authenticated.PUT("/users/password", updatePassword)

	return router
}

// Note: TestMain is already defined in events_test.go
// The E2E tests use the same test database setup

// E2E Test: Complete user registration and login flow
func TestE2E_UserRegistrationAndLogin(t *testing.T) {
	router := setupE2ETestRouter()

	// Step 1: Register a new user
	registerPayload := map[string]string{
		"email":    "testuser@example.com",
		"password": "testpassword123",
		"name":     "Test User",
	}
	registerBody, _ := json.Marshal(registerPayload)
	registerReq, _ := http.NewRequest("POST", "/signup", bytes.NewBuffer(registerBody))
	registerReq.Header.Set("Content-Type", "application/json")
	registerW := httptest.NewRecorder()
	router.ServeHTTP(registerW, registerReq)

	assert.Equal(t, http.StatusCreated, registerW.Code)
	var registerResponse map[string]interface{}
	json.Unmarshal(registerW.Body.Bytes(), &registerResponse)
	assert.Equal(t, "User created successfully", registerResponse["message"])

	// Step 2: Login with the registered user
	loginPayload := map[string]string{
		"email":    "testuser@example.com",
		"password": "testpassword123",
	}
	loginBody, _ := json.Marshal(loginPayload)
	loginReq, _ := http.NewRequest("POST", "/login", bytes.NewBuffer(loginBody))
	loginReq.Header.Set("Content-Type", "application/json")
	loginW := httptest.NewRecorder()
	router.ServeHTTP(loginW, loginReq)

	assert.Equal(t, http.StatusOK, loginW.Code)
	var loginResponse map[string]interface{}
	json.Unmarshal(loginW.Body.Bytes(), &loginResponse)
	assert.NotEmpty(t, loginResponse["token"])
	assert.Equal(t, "user", loginResponse["role"])
	assert.Equal(t, "testuser@example.com", loginResponse["email"])
}

// E2E Test: Complete event lifecycle (create, read, update, delete)
func TestE2E_EventLifecycle(t *testing.T) {
	router := setupE2ETestRouter()

	// Step 1: Register and login to get a token
	user := createTestUser(t, router, "eventuser@example.com", "password123")
	token := user["token"].(string)

	// Step 2: Create an event
	eventPayload := map[string]interface{}{
		"Name":             "E2E Test Event",
		"Description":      "This is a test event for E2E testing",
		"Location":         "Test Location",
		"DateTime":         time.Now().Add(24 * time.Hour).Format(time.RFC3339),
		"TicketsAvailable": 50,
		"Priority":         "available",
		"eventType":        "workshop",
	}
	eventBody, _ := json.Marshal(eventPayload)
	createReq, _ := http.NewRequest("POST", "/events", bytes.NewBuffer(eventBody))
	createReq.Header.Set("Content-Type", "application/json")
	createReq.Header.Set("Authorization", "Bearer "+token)
	createW := httptest.NewRecorder()
	router.ServeHTTP(createW, createReq)

	assert.Equal(t, http.StatusCreated, createW.Code)
	var createResponse map[string]interface{}
	json.Unmarshal(createW.Body.Bytes(), &createResponse)
	assert.Equal(t, "Event created successfully", createResponse["message"])
	
	eventData := createResponse["event"].(map[string]interface{})
	eventID := int64(eventData["ID"].(float64))

	// Step 3: Get all events and verify our event is there
	getAllReq, _ := http.NewRequest("GET", "/events", nil)
	getAllW := httptest.NewRecorder()
	router.ServeHTTP(getAllW, getAllReq)

	assert.Equal(t, http.StatusOK, getAllW.Code)
	var events []map[string]interface{}
	json.Unmarshal(getAllW.Body.Bytes(), &events)
	assert.Greater(t, len(events), 0)
	found := false
	for _, e := range events {
		if int64(e["ID"].(float64)) == eventID {
			assert.Equal(t, "E2E Test Event", e["Name"])
			found = true
			break
		}
	}
	assert.True(t, found, "Created event should be in the events list")

	// Step 4: Get the specific event
	getReq, _ := http.NewRequest("GET", "/events/"+strconv.FormatInt(eventID, 10), nil)
	getW := httptest.NewRecorder()
	router.ServeHTTP(getW, getReq)

	assert.Equal(t, http.StatusOK, getW.Code)
	var event map[string]interface{}
	json.Unmarshal(getW.Body.Bytes(), &event)
	assert.Equal(t, "E2E Test Event", event["Name"])

	// Step 5: Update the event
	updatePayload := map[string]interface{}{
		"Name":             "Updated E2E Test Event",
		"Description":      "Updated description",
		"Location":         "Updated Location",
		"DateTime":         time.Now().Add(48 * time.Hour).Format(time.RFC3339),
		"TicketsAvailable": 75,
		"Priority":         "almost-full",
		"eventType":        "workshop,conference",
	}
	updateBody, _ := json.Marshal(updatePayload)
	updateReq, _ := http.NewRequest("PUT", "/events/"+strconv.FormatInt(eventID, 10), bytes.NewBuffer(updateBody))
	updateReq.Header.Set("Content-Type", "application/json")
	updateReq.Header.Set("Authorization", "Bearer "+token)
	updateW := httptest.NewRecorder()
	router.ServeHTTP(updateW, updateReq)

	assert.Equal(t, http.StatusOK, updateW.Code)

	// Step 6: Verify the update
	getReq2, _ := http.NewRequest("GET", "/events/"+strconv.FormatInt(eventID, 10), nil)
	getW2 := httptest.NewRecorder()
	router.ServeHTTP(getW2, getReq2)

	var updatedEvent map[string]interface{}
	json.Unmarshal(getW2.Body.Bytes(), &updatedEvent)
	assert.Equal(t, "Updated E2E Test Event", updatedEvent["Name"])
	assert.Equal(t, float64(75), updatedEvent["TicketsAvailable"])

	// Step 7: Delete the event
	deleteReq, _ := http.NewRequest("DELETE", "/events/"+strconv.FormatInt(eventID, 10), nil)
	deleteReq.Header.Set("Authorization", "Bearer "+token)
	deleteW := httptest.NewRecorder()
	router.ServeHTTP(deleteW, deleteReq)

	assert.Equal(t, http.StatusOK, deleteW.Code)

	// Step 8: Verify the event is deleted
	getReq3, _ := http.NewRequest("GET", "/events/"+strconv.FormatInt(eventID, 10), nil)
	getW3 := httptest.NewRecorder()
	router.ServeHTTP(getW3, getReq3)

	assert.Equal(t, http.StatusInternalServerError, getW3.Code)
}

// E2E Test: Event registration flow
func TestE2E_EventRegistrationFlow(t *testing.T) {
	router := setupE2ETestRouter()

	// Step 1: Create two users
	user1 := createTestUser(t, router, "registrant1@example.com", "password123")
	user2 := createTestUser(t, router, "registrant2@example.com", "password123")
	token1 := user1["token"].(string)
	token2 := user2["token"].(string)

	// Step 2: User1 creates an event
	eventID := createTestEvent(t, router, token1, "Registration Test Event", 10)

	// Step 3: User2 checks registration status (should be false)
	statusReq, _ := http.NewRequest("GET", "/events/"+strconv.FormatInt(eventID, 10)+"/registration/status", nil)
	statusReq.Header.Set("Authorization", "Bearer "+token2)
	statusW := httptest.NewRecorder()
	router.ServeHTTP(statusW, statusReq)

	assert.Equal(t, http.StatusOK, statusW.Code)
	var statusResponse map[string]interface{}
	json.Unmarshal(statusW.Body.Bytes(), &statusResponse)
	assert.False(t, statusResponse["isRegistered"].(bool))

	// Step 4: User2 registers for the event
	registerReq, _ := http.NewRequest("POST", "/events/"+strconv.FormatInt(eventID, 10)+"/register", nil)
	registerReq.Header.Set("Authorization", "Bearer "+token2)
	registerW := httptest.NewRecorder()
	router.ServeHTTP(registerW, registerReq)

	assert.Equal(t, http.StatusCreated, registerW.Code)

	// Step 5: User2 checks registration status again (should be true)
	statusReq2, _ := http.NewRequest("GET", "/events/"+strconv.FormatInt(eventID, 10)+"/registration/status", nil)
	statusReq2.Header.Set("Authorization", "Bearer "+token2)
	statusW2 := httptest.NewRecorder()
	router.ServeHTTP(statusW2, statusReq2)

	assert.Equal(t, http.StatusOK, statusW2.Code)
	var statusResponse2 map[string]interface{}
	json.Unmarshal(statusW2.Body.Bytes(), &statusResponse2)
	assert.True(t, statusResponse2["isRegistered"].(bool))

	// Step 6: User2 cancels registration
	cancelReq, _ := http.NewRequest("DELETE", "/events/"+strconv.FormatInt(eventID, 10)+"/register", nil)
	cancelReq.Header.Set("Authorization", "Bearer "+token2)
	cancelW := httptest.NewRecorder()
	router.ServeHTTP(cancelW, cancelReq)

	assert.Equal(t, http.StatusOK, cancelW.Code)

	// Step 7: Verify registration is cancelled
	statusReq3, _ := http.NewRequest("GET", "/events/"+strconv.FormatInt(eventID, 10)+"/registration/status", nil)
	statusReq3.Header.Set("Authorization", "Bearer "+token2)
	statusW3 := httptest.NewRecorder()
	router.ServeHTTP(statusW3, statusReq3)

	var statusResponse3 map[string]interface{}
	json.Unmarshal(statusW3.Body.Bytes(), &statusResponse3)
	assert.False(t, statusResponse3["isRegistered"].(bool))
}

// E2E Test: User profile management
func TestE2E_UserProfileManagement(t *testing.T) {
	router := setupE2ETestRouter()

	// Step 1: Register and login
	user := createTestUser(t, router, "profileuser@example.com", "password123")
	token := user["token"].(string)

	// Step 2: Get profile
	getProfileReq, _ := http.NewRequest("GET", "/users/profile", nil)
	getProfileReq.Header.Set("Authorization", "Bearer "+token)
	getProfileW := httptest.NewRecorder()
	router.ServeHTTP(getProfileW, getProfileReq)

	assert.Equal(t, http.StatusOK, getProfileW.Code)
	var profile map[string]interface{}
	json.Unmarshal(getProfileW.Body.Bytes(), &profile)
	assert.Equal(t, "profileuser@example.com", profile["email"])

	// Step 3: Update profile
	updatePayload := map[string]interface{}{
		"name":                "Updated Name",
		"preferredEventTypes": []string{"workshop", "conference"},
	}
	updateBody, _ := json.Marshal(updatePayload)
	updateReq, _ := http.NewRequest("PUT", "/users/profile", bytes.NewBuffer(updateBody))
	updateReq.Header.Set("Content-Type", "application/json")
	updateReq.Header.Set("Authorization", "Bearer "+token)
	updateW := httptest.NewRecorder()
	router.ServeHTTP(updateW, updateReq)

	assert.Equal(t, http.StatusOK, updateW.Code)

	// Step 4: Verify profile update
	getProfileReq2, _ := http.NewRequest("GET", "/users/profile", nil)
	getProfileReq2.Header.Set("Authorization", "Bearer "+token)
	getProfileW2 := httptest.NewRecorder()
	router.ServeHTTP(getProfileW2, getProfileReq2)

	var updatedProfile map[string]interface{}
	json.Unmarshal(getProfileW2.Body.Bytes(), &updatedProfile)
	assert.Equal(t, "Updated Name", updatedProfile["name"])

	// Step 5: Update password
	passwordPayload := map[string]string{
		"newPassword": "newpassword123",
	}
	passwordBody, _ := json.Marshal(passwordPayload)
	passwordReq, _ := http.NewRequest("PUT", "/users/password", bytes.NewBuffer(passwordBody))
	passwordReq.Header.Set("Content-Type", "application/json")
	passwordReq.Header.Set("Authorization", "Bearer "+token)
	passwordW := httptest.NewRecorder()
	router.ServeHTTP(passwordW, passwordReq)

	assert.Equal(t, http.StatusOK, passwordW.Code)

	// Step 6: Login with new password
	loginPayload := map[string]string{
		"email":    "profileuser@example.com",
		"password": "newpassword123",
	}
	loginBody, _ := json.Marshal(loginPayload)
	loginReq, _ := http.NewRequest("POST", "/login", bytes.NewBuffer(loginBody))
	loginReq.Header.Set("Content-Type", "application/json")
	loginW := httptest.NewRecorder()
	router.ServeHTTP(loginW, loginReq)

	assert.Equal(t, http.StatusOK, loginW.Code)
}

// E2E Test: Authorization and access control
func TestE2E_AuthorizationAndAccessControl(t *testing.T) {
	router := setupE2ETestRouter()

	// Step 1: Create two users
	user1 := createTestUser(t, router, "owner@example.com", "password123")
	user2 := createTestUser(t, router, "other@example.com", "password123")
	token1 := user1["token"].(string)
	token2 := user2["token"].(string)

	// Step 2: User1 creates an event
	eventID := createTestEvent(t, router, token1, "Owner's Event", 20)

	// Step 3: User2 tries to update User1's event (should fail)
	updatePayload := map[string]interface{}{
		"Name":             "Hacked Event",
		"Description":      "Unauthorized update",
		"Location":         "Hacked Location",
		"DateTime":         time.Now().Add(24 * time.Hour).Format(time.RFC3339),
		"TicketsAvailable": 100,
	}
	updateBody, _ := json.Marshal(updatePayload)
	updateReq, _ := http.NewRequest("PUT", "/events/"+strconv.FormatInt(eventID, 10), bytes.NewBuffer(updateBody))
	updateReq.Header.Set("Content-Type", "application/json")
	updateReq.Header.Set("Authorization", "Bearer "+token2)
	updateW := httptest.NewRecorder()
	router.ServeHTTP(updateW, updateReq)

	assert.Equal(t, http.StatusUnauthorized, updateW.Code)

	// Step 4: User2 tries to delete User1's event (should fail)
	deleteReq, _ := http.NewRequest("DELETE", "/events/"+strconv.FormatInt(eventID, 10), nil)
	deleteReq.Header.Set("Authorization", "Bearer "+token2)
	deleteW := httptest.NewRecorder()
	router.ServeHTTP(deleteW, deleteReq)

	assert.Equal(t, http.StatusUnauthorized, deleteW.Code)

	// Step 5: User1 can update their own event (should succeed)
	updatePayload2 := map[string]interface{}{
		"Name":             "Updated Owner's Event",
		"Description":      "Authorized update",
		"Location":         "Authorized Location",
		"DateTime":         time.Now().Add(24 * time.Hour).Format(time.RFC3339),
		"TicketsAvailable": 30,
	}
	updateBody2, _ := json.Marshal(updatePayload2)
	updateReq2, _ := http.NewRequest("PUT", "/events/"+strconv.FormatInt(eventID, 10), bytes.NewBuffer(updateBody2))
	updateReq2.Header.Set("Content-Type", "application/json")
	updateReq2.Header.Set("Authorization", "Bearer "+token1)
	updateW2 := httptest.NewRecorder()
	router.ServeHTTP(updateW2, updateReq2)

	assert.Equal(t, http.StatusOK, updateW2.Code)
}

// Helper function to create a test user and return login response
func createTestUser(t *testing.T, router *gin.Engine, email, password string) map[string]interface{} {
	// Register
	registerPayload := map[string]string{
		"email":    email,
		"password": password,
		"name":     "Test User",
	}
	registerBody, _ := json.Marshal(registerPayload)
	registerReq, _ := http.NewRequest("POST", "/signup", bytes.NewBuffer(registerBody))
	registerReq.Header.Set("Content-Type", "application/json")
	registerW := httptest.NewRecorder()
	router.ServeHTTP(registerW, registerReq)

	if registerW.Code != http.StatusCreated {
		t.Fatalf("Failed to create user: %s", registerW.Body.String())
	}

	// Login
	loginPayload := map[string]string{
		"email":    email,
		"password": password,
	}
	loginBody, _ := json.Marshal(loginPayload)
	loginReq, _ := http.NewRequest("POST", "/login", bytes.NewBuffer(loginBody))
	loginReq.Header.Set("Content-Type", "application/json")
	loginW := httptest.NewRecorder()
	router.ServeHTTP(loginW, loginReq)

	if loginW.Code != http.StatusOK {
		t.Fatalf("Failed to login user: %s", loginW.Body.String())
	}

	var loginResponse map[string]interface{}
	json.Unmarshal(loginW.Body.Bytes(), &loginResponse)
	return loginResponse
}

// Helper function to create a test event and return event ID
func createTestEvent(t *testing.T, router *gin.Engine, token, name string, tickets int) int64 {
	eventPayload := map[string]interface{}{
		"Name":             name,
		"Description":      "Test event description",
		"Location":         "Test Location",
		"DateTime":         time.Now().Add(24 * time.Hour).Format(time.RFC3339),
		"TicketsAvailable": tickets,
		"Priority":         "available",
	}
	eventBody, _ := json.Marshal(eventPayload)
	createReq, _ := http.NewRequest("POST", "/events", bytes.NewBuffer(eventBody))
	createReq.Header.Set("Content-Type", "application/json")
	createReq.Header.Set("Authorization", "Bearer "+token)
	createW := httptest.NewRecorder()
	router.ServeHTTP(createW, createReq)

	if createW.Code != http.StatusCreated {
		t.Fatalf("Failed to create event: %s", createW.Body.String())
	}

	var createResponse map[string]interface{}
	json.Unmarshal(createW.Body.Bytes(), &createResponse)
	eventData := createResponse["event"].(map[string]interface{})
	return int64(eventData["ID"].(float64))
}

