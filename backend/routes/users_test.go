package routes

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"event-planner/db"
	"event-planner/models"
	"event-planner/utils"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	_ "github.com/mattn/go-sqlite3"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func setupUsersTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/signup", signup)
	router.POST("/login", login)
	router.PUT("/password", func(c *gin.Context) {
		// Set userId in context for testing
		userIdStr := c.Query("userId")
		if userIdStr != "" {
			userId, _ := strconv.ParseInt(userIdStr, 10, 64)
			c.Set("userId", userId)
		} else {
			c.Set("userId", int64(1)) // Default userId
		}
		updatePassword(c)
	})
	return router
}

func setupUsersTestDB(t *testing.T) *sql.DB {
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
	`
	_, err = testDB.Exec(createTables)
	if err != nil {
		t.Fatalf("Failed to create tables: %v", err)
	}

	return testDB
}

func TestSignup_Valid(t *testing.T) {
	testDB := setupUsersTestDB(t)
	defer testDB.Close()

	originalDB := db.DB
	db.DB = testDB
	defer func() { db.DB = originalDB }()

	router := setupUsersTestRouter()
	payload := map[string]string{
		"email":    "newuser@example.com",
		"password": "password123",
		"role":     "user",
	}
	jsonPayload, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/signup", bytes.NewBuffer(jsonPayload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "User created successfully", response["message"])

	// Verify user was created in database
	var count int
	err := testDB.QueryRow("SELECT COUNT(*) FROM users WHERE email = ?", "newuser@example.com").Scan(&count)
	assert.NoError(t, err)
	assert.Equal(t, 1, count)
}

func TestSignup_InvalidJSON(t *testing.T) {
	testDB := setupUsersTestDB(t)
	defer testDB.Close()

	originalDB := db.DB
	db.DB = testDB
	defer func() { db.DB = originalDB }()

	router := setupUsersTestRouter()
	req, _ := http.NewRequest("POST", "/signup", bytes.NewBuffer([]byte("invalid json")))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadGateway, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "Could not parse data", response["message"])
}

func TestSignup_DuplicateEmail(t *testing.T) {
	testDB := setupUsersTestDB(t)
	defer testDB.Close()

	originalDB := db.DB
	db.DB = testDB
	defer func() { db.DB = originalDB }()

	// Create existing user
	existingUser := models.User{
		Email:    "existing@example.com",
		Password: "password123",
		Role:     "user",
	}
	err := existingUser.Save()
	assert.NoError(t, err)

	router := setupUsersTestRouter()
	payload := map[string]string{
		"email":    "existing@example.com",
		"password": "password456",
	}
	jsonPayload, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/signup", bytes.NewBuffer(jsonPayload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "Could not save user", response["message"])
}

func TestLogin_Valid(t *testing.T) {
	testDB := setupUsersTestDB(t)
	defer testDB.Close()

	originalDB := db.DB
	db.DB = testDB
	defer func() { db.DB = originalDB }()

	// Create a test user
	user := models.User{
		Email:    "test@example.com",
		Password: "password123",
		Role:     "user",
	}
	err := user.Save()
	assert.NoError(t, err)

	router := setupUsersTestRouter()
	payload := map[string]string{
		"email":    "test@example.com",
		"password": "password123",
	}
	jsonPayload, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/login", bytes.NewBuffer(jsonPayload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "Login successful", response["message"])
	assert.NotEmpty(t, response["token"])
	assert.Equal(t, "user", response["role"])
	assert.Equal(t, "test@example.com", response["email"])

	// Verify token is valid
	token, ok := response["token"].(string)
	assert.True(t, ok)
	verifiedUserID, err := utils.VerifyToken(token)
	assert.NoError(t, err)
	// Get the actual user ID from database since Save() uses value receiver
	var actualUserID int64
	err = testDB.QueryRow("SELECT id FROM users WHERE email = ?", "test@example.com").Scan(&actualUserID)
	assert.NoError(t, err)
	assert.Equal(t, actualUserID, verifiedUserID)
}

func TestLogin_InvalidCredentials(t *testing.T) {
	testDB := setupUsersTestDB(t)
	defer testDB.Close()

	originalDB := db.DB
	db.DB = testDB
	defer func() { db.DB = originalDB }()

	// Create a test user
	user := models.User{
		Email:    "test@example.com",
		Password: "password123",
		Role:     "user",
	}
	err := user.Save()
	assert.NoError(t, err)

	router := setupUsersTestRouter()
	payload := map[string]string{
		"email":    "test@example.com",
		"password": "wrongpassword",
	}
	jsonPayload, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/login", bytes.NewBuffer(jsonPayload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "Could not authenticate user", response["message"])
}

func TestLogin_NonExistentUser(t *testing.T) {
	testDB := setupUsersTestDB(t)
	defer testDB.Close()

	originalDB := db.DB
	db.DB = testDB
	defer func() { db.DB = originalDB }()

	router := setupUsersTestRouter()
	payload := map[string]string{
		"email":    "nonexistent@example.com",
		"password": "password123",
	}
	jsonPayload, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/login", bytes.NewBuffer(jsonPayload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "Could not authenticate user", response["message"])
}

func TestLogin_InvalidJSON(t *testing.T) {
	testDB := setupUsersTestDB(t)
	defer testDB.Close()

	originalDB := db.DB
	db.DB = testDB
	defer func() { db.DB = originalDB }()

	router := setupUsersTestRouter()
	req, _ := http.NewRequest("POST", "/login", bytes.NewBuffer([]byte("invalid json")))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "Could not parse data", response["message"])
}

func TestLogin_AdminRole(t *testing.T) {
	testDB := setupUsersTestDB(t)
	defer testDB.Close()

	originalDB := db.DB
	db.DB = testDB
	defer func() { db.DB = originalDB }()

	// Create an admin user
	user := models.User{
		Email:    "admin@example.com",
		Password: "adminpass",
		Role:     "admin",
	}
	err := user.Save()
	assert.NoError(t, err)

	router := setupUsersTestRouter()
	payload := map[string]string{
		"email":    "admin@example.com",
		"password": "adminpass",
	}
	jsonPayload, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/login", bytes.NewBuffer(jsonPayload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "admin", response["role"])
}

func TestUpdatePassword_Valid(t *testing.T) {
	testDB := setupUsersTestDB(t)
	defer testDB.Close()

	originalDB := db.DB
	db.DB = testDB
	defer func() { db.DB = originalDB }()

	// Create a test user
	user := models.User{
		Email:    "test@example.com",
		Password: "oldpassword",
		Role:     "user",
	}
	err := user.Save()
	assert.NoError(t, err)

	// Get the actual user ID from database since Save() uses value receiver
	var actualUserID int64
	err = testDB.QueryRow("SELECT id FROM users WHERE email = ?", "test@example.com").Scan(&actualUserID)
	assert.NoError(t, err)

	router := setupUsersTestRouter()
	payload := map[string]string{
		"newPassword": "newpassword123",
	}
	jsonPayload, _ := json.Marshal(payload)
	req, _ := http.NewRequest("PUT", "/password?userId="+strconv.FormatInt(actualUserID, 10), bytes.NewBuffer(jsonPayload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "Password updated successfully", response["message"])

	// Verify password was updated
	loginUser := models.User{
		Email:    "test@example.com",
		Password: "newpassword123",
	}
	err = loginUser.ValidateCredentials()
	assert.NoError(t, err)
}

func TestUpdatePassword_TooShort(t *testing.T) {
	testDB := setupUsersTestDB(t)
	defer testDB.Close()

	originalDB := db.DB
	db.DB = testDB
	defer func() { db.DB = originalDB }()

	// Create a test user
	user := models.User{
		Email:    "test@example.com",
		Password: "oldpassword",
		Role:     "user",
	}
	err := user.Save()
	assert.NoError(t, err)

	router := setupUsersTestRouter()
	payload := map[string]string{
		"newPassword": "short", // Less than 6 characters
	}
	jsonPayload, _ := json.Marshal(payload)
	req, _ := http.NewRequest("PUT", "/password?userId="+strconv.FormatInt(user.ID, 10), bytes.NewBuffer(jsonPayload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "Password must be at least 6 characters long", response["message"])
}

func TestUpdatePassword_InvalidJSON(t *testing.T) {
	testDB := setupUsersTestDB(t)
	defer testDB.Close()

	originalDB := db.DB
	db.DB = testDB
	defer func() { db.DB = originalDB }()

	router := setupUsersTestRouter()
	req, _ := http.NewRequest("PUT", "/password?userId=1", bytes.NewBuffer([]byte("invalid json")))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "Could not parse data", response["message"])
}

func TestUpdatePassword_UserNotFound(t *testing.T) {
	testDB := setupUsersTestDB(t)
	defer testDB.Close()

	originalDB := db.DB
	db.DB = testDB
	defer func() { db.DB = originalDB }()

	router := setupUsersTestRouter()
	payload := map[string]string{
		"newPassword": "newpassword123",
	}
	jsonPayload, _ := json.Marshal(payload)
	req, _ := http.NewRequest("PUT", "/password?userId=99999", bytes.NewBuffer(jsonPayload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "User not found", response["message"])
}

