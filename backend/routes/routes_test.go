package routes

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestRegisterRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	RegisterRoutes(router)

	// Test that routes are registered
	// Test GET /events
	req, _ := http.NewRequest("GET", "/events", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.NotEqual(t, http.StatusNotFound, w.Code)

	// Test GET /events/:id
	req, _ = http.NewRequest("GET", "/events/1", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.NotEqual(t, http.StatusNotFound, w.Code)

	// Test POST /events (authenticated)
	req, _ = http.NewRequest("POST", "/events", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	// Should either return 401 (unauthorized) or 400 (bad request), not 404
	assert.NotEqual(t, http.StatusNotFound, w.Code)

	// Test PUT /events/:id (authenticated)
	req, _ = http.NewRequest("PUT", "/events/1", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.NotEqual(t, http.StatusNotFound, w.Code)

	// Test DELETE /events/:id (authenticated)
	req, _ = http.NewRequest("DELETE", "/events/1", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.NotEqual(t, http.StatusNotFound, w.Code)

	// Test POST /signup
	req, _ = http.NewRequest("POST", "/signup", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.NotEqual(t, http.StatusNotFound, w.Code)

	// Test POST /login
	req, _ = http.NewRequest("POST", "/login", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.NotEqual(t, http.StatusNotFound, w.Code)

	// Test POST /events/:id/register (authenticated)
	req, _ = http.NewRequest("POST", "/events/1/register", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	// Should either return 401 (unauthorized) or 400/500 (bad request/internal error), not 404
	assert.NotEqual(t, http.StatusNotFound, w.Code)

	// Test DELETE /events/:id/register (authenticated)
	req, _ = http.NewRequest("DELETE", "/events/1/register", nil)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)
	// Should either return 401 (unauthorized) or 400/500 (bad request/internal error), not 404
	assert.NotEqual(t, http.StatusNotFound, w.Code)
}

func TestRegisterRoutes_AuthenticatedGroup(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	RegisterRoutes(router)

	// Verify authenticated routes exist
	// These should exist but return 401 without auth
	testCases := []struct {
		method string
		path   string
	}{
		{"POST", "/events"},
		{"PUT", "/events/1"},
		{"DELETE", "/events/1"},
		{"POST", "/events/1/register"},
		{"DELETE", "/events/1/register"},
	}

	for _, tc := range testCases {
		req, _ := http.NewRequest(tc.method, tc.path, nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		// Should not be 404 (route exists)
		assert.NotEqual(t, http.StatusNotFound, w.Code, "Route %s %s should exist", tc.method, tc.path)
	}
}

func TestRegisterRoutes_PublicRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	RegisterRoutes(router)

	// Verify public routes exist
	testCases := []struct {
		method string
		path   string
	}{
		{"GET", "/events"},
		{"GET", "/events/1"},
		{"POST", "/signup"},
		{"POST", "/login"},
	}

	for _, tc := range testCases {
		req, _ := http.NewRequest(tc.method, tc.path, nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		// Should not be 404 (route exists)
		assert.NotEqual(t, http.StatusNotFound, w.Code, "Route %s %s should exist", tc.method, tc.path)
	}
}

