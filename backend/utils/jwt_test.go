package utils

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt"
	"github.com/stretchr/testify/assert"
)

func TestGenerateToken(t *testing.T) {
	tests := []struct {
		name    string
		userID  int64
		email   string
		wantErr bool
	}{
		{
			name:    "valid user ID and email",
			userID:  1,
			email:   "test@example.com",
			wantErr: false,
		},
		{
			name:    "zero user ID",
			userID:  0,
			email:   "test@example.com",
			wantErr: false,
		},
		{
			name:    "large user ID",
			userID:  999999999,
			email:   "test@example.com",
			wantErr: false,
		},
		{
			name:    "empty email",
			userID:  1,
			email:   "",
			wantErr: false,
		},
		{
			name:    "email with special characters",
			userID:  1,
			email:   "test+user@example.co.uk",
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			token, err := GenerateToken(tt.userID, tt.email)
			if tt.wantErr {
				assert.Error(t, err)
				assert.Empty(t, token)
			} else {
				assert.NoError(t, err)
				assert.NotEmpty(t, token)
			}
		})
	}
}

func TestVerifyToken(t *testing.T) {
	// Generate a valid token for testing
	userID := int64(123)
	email := "test@example.com"
	validToken, err := GenerateToken(userID, email)
	assert.NoError(t, err)
	assert.NotEmpty(t, validToken)

	tests := []struct {
		name    string
		token   string
		wantID  int64
		wantErr bool
	}{
		{
			name:    "valid token",
			token:   validToken,
			wantID:  userID,
			wantErr: false,
		},
		{
			name:    "empty token",
			token:   "",
			wantID:  0,
			wantErr: true,
		},
		{
			name:    "invalid token format",
			token:   "not.a.valid.token",
			wantID:  0,
			wantErr: true,
		},
		{
			name:    "random string",
			token:   "randomstring123",
			wantID:  0,
			wantErr: true,
		},
		{
			name:    "token with wrong signature",
			token:   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIn0.wrongsignature",
			wantID:  0,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotID, err := VerifyToken(tt.token)
			if tt.wantErr {
				assert.Error(t, err)
				assert.Equal(t, int64(0), gotID)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.wantID, gotID)
			}
		})
	}
}

func TestVerifyToken_ExpiredToken(t *testing.T) {
	// Create an expired token manually
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"userId": int64(123),
		"email":  "test@example.com",
		"exp":    time.Now().Add(-time.Hour).Unix(), // Expired 1 hour ago
	})

	expiredToken, err := token.SignedString([]byte(secretKey))
	assert.NoError(t, err)

	// Verify that expired token is rejected
	userID, err := VerifyToken(expiredToken)
	assert.Error(t, err)
	assert.Equal(t, int64(0), userID)
}

func TestGenerateToken_VerifyToken_RoundTrip(t *testing.T) {
	testCases := []struct {
		name   string
		userID int64
		email  string
	}{
		{
			name:   "standard user",
			userID: 1,
			email:  "user@example.com",
		},
		{
			name:   "admin user",
			userID: 999,
			email:  "admin@example.com",
		},
		{
			name:   "zero ID",
			userID: 0,
			email:  "test@example.com",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Generate token
			token, err := GenerateToken(tc.userID, tc.email)
			assert.NoError(t, err)
			assert.NotEmpty(t, token)

			// Verify token
			verifiedID, err := VerifyToken(token)
			assert.NoError(t, err)
			assert.Equal(t, tc.userID, verifiedID)
		})
	}
}

func TestVerifyToken_InvalidSigningMethod(t *testing.T) {
	// Create a token signed with a different secret key
	invalidToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"userId": int64(123),
		"email":  "test@example.com",
		"exp":    time.Now().Add(time.Hour * 2).Unix(),
	}).SignedString([]byte("differentsecretkey"))

	assert.NoError(t, err)

	// Verify should fail because the secret key doesn't match
	userID, err := VerifyToken(invalidToken)
	assert.Error(t, err)
	assert.Equal(t, int64(0), userID)
}

func TestVerifyToken_MissingClaims(t *testing.T) {
	// Create a token without userId claim
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"email": "test@example.com",
		"exp":   time.Now().Add(time.Hour * 2).Unix(),
	})

	tokenString, err := token.SignedString([]byte(secretKey))
	assert.NoError(t, err)

	// Verify should panic because userId claim is missing
	// This reveals a potential bug in VerifyToken - it should check if userId exists
	defer func() {
		if r := recover(); r != nil {
			// Expected panic when userId claim is missing
			assert.NotNil(t, r)
		} else {
			t.Error("Expected panic when userId claim is missing")
		}
	}()

	userID, err := VerifyToken(tokenString)
	// Should not reach here due to panic
	t.Errorf("Should have panicked, but got userID=%d, err=%v", userID, err)
}

