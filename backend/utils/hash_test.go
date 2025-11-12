package utils

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestHashPassword(t *testing.T) {
	tests := []struct {
		name     string
		password string
		wantErr  bool
	}{
		{
			name:     "valid password",
			password: "password123",
			wantErr:  false,
		},
		{
			name:     "empty password",
			password: "",
			wantErr:  false, // bcrypt allows empty passwords
		},
		{
			name:     "long password",
			password: "this is a very long password with many characters and symbols !@#$%^&*()",
			wantErr:  false,
		},
		{
			name:     "password with special characters",
			password: "p@ssw0rd!@#$%",
			wantErr:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hash, err := HashPassword(tt.password)
			if tt.wantErr {
				assert.Error(t, err)
				assert.Empty(t, hash)
			} else {
				assert.NoError(t, err)
				assert.NotEmpty(t, hash)
				// Hash should be different from original password
				assert.NotEqual(t, tt.password, hash)
				// Hash should be at least 60 characters (bcrypt hash length)
				assert.GreaterOrEqual(t, len(hash), 60)
			}
		})
	}
}

func TestCheckPasswordHash(t *testing.T) {
	// First, create a hash for testing
	password := "testpassword123"
	hash, err := HashPassword(password)
	assert.NoError(t, err)
	assert.NotEmpty(t, hash)

	tests := []struct {
		name     string
		password string
		hash     string
		want     bool
	}{
		{
			name:     "correct password",
			password: password,
			hash:     hash,
			want:     true,
		},
		{
			name:     "incorrect password",
			password: "wrongpassword",
			hash:     hash,
			want:     false,
		},
		{
			name:     "empty password with valid hash",
			password: "",
			hash:     hash,
			want:     false,
		},
		{
			name:     "correct password with empty hash",
			password: password,
			hash:     "",
			want:     false,
		},
		{
			name:     "empty password and empty hash",
			password: "",
			hash:     "",
			want:     false,
		},
		{
			name:     "case sensitive password",
			password: "TestPassword123",
			hash:     hash,
			want:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := CheckPasswordHash(tt.password, tt.hash)
			assert.Equal(t, tt.want, result)
		})
	}
}

func TestHashPassword_Uniqueness(t *testing.T) {
	// Test that hashing the same password multiple times produces different hashes
	// (due to salt)
	password := "samepassword"
	hash1, err1 := HashPassword(password)
	hash2, err2 := HashPassword(password)

	assert.NoError(t, err1)
	assert.NoError(t, err2)
	assert.NotEqual(t, hash1, hash2, "Hashes should be different due to salt")

	// But both should verify correctly
	assert.True(t, CheckPasswordHash(password, hash1))
	assert.True(t, CheckPasswordHash(password, hash2))
}

func TestCheckPasswordHash_InvalidHash(t *testing.T) {
	// Test with invalid hash format
	invalidHashes := []string{
		"notavalidhash",
		"short",
		"$2a$10$invalid",
		"randomstring12345",
	}

	for _, invalidHash := range invalidHashes {
		t.Run("invalid hash: "+invalidHash, func(t *testing.T) {
			result := CheckPasswordHash("anypassword", invalidHash)
			assert.False(t, result, "Invalid hash should return false")
		})
	}
}

