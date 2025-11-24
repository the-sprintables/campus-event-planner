package routes

import (
	"event-planner/models"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type registerRequest struct {
	Quantity int64 `json:"quantity"`
}

func registerForEvent(context *gin.Context) {
	userId := context.GetInt64("userId")
	eventId, err := strconv.ParseInt(context.Param("id"), 10, 64)

	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"message": "Could not parse event id"})
		return
	}

	// Parse request body for quantity (default to 1 if not provided)
	var req registerRequest
	if err := context.ShouldBindJSON(&req); err != nil {
		// If no JSON body, default to quantity 1 for backward compatibility
		req.Quantity = 1
	}

	if req.Quantity <= 0 {
		req.Quantity = 1
	}

	event, err := models.GetEventByID(eventId)

	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"message": "Could not fetch event"})
		return
	}

	err = event.Register(userId, req.Quantity)

	if err != nil {
		if strings.Contains(err.Error(), "already registered") {
			context.JSON(http.StatusConflict, gin.H{"message": "User already registered for this event"})
			return
		}
		if strings.Contains(err.Error(), "Not enough tickets") {
			context.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
			return
		}
		context.JSON(http.StatusInternalServerError, gin.H{"message": "Could not register for event"})
		return
	}

	context.JSON(http.StatusCreated, gin.H{
		"message":  "Registered for event successfully",
		"quantity": req.Quantity,
	})
}

func cancelRegistration(context *gin.Context) {
	userId := context.GetInt64("userId")
	eventId, err := strconv.ParseInt(context.Param("id"), 10, 64)

	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"message": "Could not parse event id"})
		return
	}

	event, err := models.GetEventByID(eventId)

	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"message": "Could not fetch event"})
		return
	}

	// Cancel registration and get the quantity that was canceled
	quantity, err := event.CancelRegistration(userId)

	if err != nil {
		if strings.Contains(err.Error(), "already been cancelled") {
			context.JSON(http.StatusNotFound, gin.H{"message": "Event does not exist or has already been cancelled"})
			return
		}
		context.JSON(http.StatusInternalServerError, gin.H{"message": "Could not cancel registration"})
		return
	}

	context.JSON(http.StatusOK, gin.H{
		"message":  "Cancelled successfully",
		"quantity": quantity,
	})
}

func getRegistrationStatus(context *gin.Context) {
	userId := context.GetInt64("userId")
	eventId, err := strconv.ParseInt(context.Param("id"), 10, 64)

	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"message": "Could not parse event id"})
		return
	}

	isRegistered, err := models.IsUserRegisteredForEvent(eventId, userId)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"message": "Could not check registration status"})
		return
	}

	context.JSON(http.StatusOK, gin.H{"isRegistered": isRegistered})
}
