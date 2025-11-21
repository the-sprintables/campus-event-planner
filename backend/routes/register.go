package routes

import (
	"event-planner/models"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

func registerForEvent(context *gin.Context) {
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

	err = event.Register(userId)

	if err != nil {
		if strings.Contains(err.Error(), "already registered") {
			context.JSON(http.StatusConflict, gin.H{"message": "User already registered for this event"})
			return
		}
		context.JSON(http.StatusInternalServerError, gin.H{"message": "Could not register for event"})
		return
	}

	context.JSON(http.StatusCreated, gin.H{"message": "Registered for event successfully"})
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

	err = event.CancelRegistration(userId)

	if err != nil {
		if strings.Contains(err.Error(), "already been cancelled") {
			context.JSON(http.StatusNotFound, gin.H{"message": "Event does not exist or has already been cancelled"})
			return
		}
		context.JSON(http.StatusInternalServerError, gin.H{"message": "Could not cancel registration"})
		return
	}

	context.JSON(http.StatusOK, gin.H{"message": "Cancelled successfully"})
}
