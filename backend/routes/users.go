package routes

import (
	"event-planner/db"
	"event-planner/models"
	"event-planner/utils"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func signup(context *gin.Context) {
	var user models.User

	err := context.ShouldBindJSON(&user)

	if err != nil {
		context.JSON(http.StatusBadGateway, gin.H{"message": "Could not parse data"})
		return
	}

	err = user.Save()
	if err != nil {
		// Log the actual error for debugging
		log.Printf("Error saving user: %v", err)
		
		// Check if it's a duplicate email error (SQLite unique constraint)
		if strings.Contains(err.Error(), "UNIQUE constraint failed") || 
		   strings.Contains(err.Error(), "duplicate") ||
		   strings.Contains(err.Error(), "constraint") {
			context.JSON(http.StatusConflict, gin.H{"message": "Email already exists"})
			return
		}
		
		context.JSON(http.StatusInternalServerError, gin.H{"message": "Could not save user"})
		return
	}
	context.JSON(http.StatusCreated, gin.H{"message": "User created successfully"})
}

func login(context *gin.Context) {
	var user models.User

	err := context.ShouldBindJSON(&user)

	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"message": "Could not parse data"})
		return
	}

	err = user.ValidateCredentials()

	if err != nil {
		context.JSON(http.StatusUnauthorized, gin.H{"message": "Could not authenticate user"})
		return
	}

	token, err := utils.GenerateToken(user.ID, user.Email)

	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"message": "Could not auth user"})
		return
	}

	context.JSON(http.StatusOK, gin.H{
		"message": "Login successful", 
		"token": token,
		"role": user.Role,
		"email": user.Email,
	})
}

func updatePassword(context *gin.Context) {
	userId := context.GetInt64("userId")
	
	var request struct {
		NewPassword string `json:"newPassword" binding:"required"`
	}
	
	err := context.ShouldBindJSON(&request)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"message": "Could not parse data"})
		return
	}

	if len(request.NewPassword) < 6 {
		context.JSON(http.StatusBadRequest, gin.H{"message": "Password must be at least 6 characters long"})
		return
	}

	// Get user by ID
	var user models.User
	query := "SELECT id, email, COALESCE(role, 'user') FROM users WHERE id = ?"
	row := db.DB.QueryRow(query, userId)
	err = row.Scan(&user.ID, &user.Email, &user.Role)
	if err != nil {
		context.JSON(http.StatusNotFound, gin.H{"message": "User not found"})
		return
	}

	// Update password
	err = user.UpdatePassword(request.NewPassword)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"message": "Could not update password"})
		return
	}

	context.JSON(http.StatusOK, gin.H{"message": "Password updated successfully"})
}

func getProfile(context *gin.Context) {
	userId := context.GetInt64("userId")

	user, err := models.GetUserByID(userId)
	if err != nil {
		context.JSON(http.StatusNotFound, gin.H{"message": "User not found"})
		return
	}

	// Parse preferred event types from comma-separated string to array
	var preferredEventTypes []string
	if user.PreferredEventTypes != "" {
		preferredEventTypes = strings.Split(user.PreferredEventTypes, ",")
		// Trim whitespace from each type
		for i, eventType := range preferredEventTypes {
			preferredEventTypes[i] = strings.TrimSpace(eventType)
		}
	}

	context.JSON(http.StatusOK, gin.H{
		"id":                  user.ID,
		"email":               user.Email,
		"name":                user.Name,
		"role":                user.Role,
		"preferredEventTypes": preferredEventTypes,
	})
}

func updateProfile(context *gin.Context) {
	userId := context.GetInt64("userId")

	var request struct {
		Name                string   `json:"name"`
		PreferredEventTypes []string `json:"preferredEventTypes"`
	}

	err := context.ShouldBindJSON(&request)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"message": "Could not parse data"})
		return
	}

	// Get user by ID
	user, err := models.GetUserByID(userId)
	if err != nil {
		context.JSON(http.StatusNotFound, gin.H{"message": "User not found"})
		return
	}

	// Convert preferred event types array to comma-separated string
	preferredEventTypesStr := strings.Join(request.PreferredEventTypes, ",")

	// Update profile
	err = user.UpdateProfile(request.Name, preferredEventTypesStr)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"message": "Could not update profile"})
		return
	}

	context.JSON(http.StatusOK, gin.H{
		"message": "Profile updated successfully",
		"name":    request.Name,
		"preferredEventTypes": request.PreferredEventTypes,
	})
}
