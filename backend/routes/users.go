package routes

import (
	"event-planner/db"
	"event-planner/models"
	"event-planner/utils"
	"net/http"

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
