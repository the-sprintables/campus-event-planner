package routes

import (
	"event-planner/models"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func parseEventID(context *gin.Context) (int64, bool) {
	eventId, err := strconv.ParseInt(context.Param("id"), 10, 64)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"message": "Could not parse event id"})
		return 0, false
	}
	return eventId, true
}

func getEventByID(context *gin.Context, eventId int64) (*models.Event, bool) {
	event, err := models.GetEventByID(eventId)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"message": "Could not fetch event"})
		return nil, false
	}
	return event, true
}

func checkEventAuthorization(context *gin.Context, event *models.Event, userId int64, action string) bool {
	if event.UserID != userId {
		context.JSON(http.StatusUnauthorized, gin.H{"message": "You are not authorized to " + action + " this event"})
		return false
	}
	return true
}

func GetEvents(context *gin.Context) {
	events, err := models.GetAllEvents()
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"message": "Could not retrieve events", "error": err.Error()})
		return
	}
	if events == nil {
		events = []models.Event{}
	}
	context.JSON(http.StatusOK, events)
}

func CreateEvent(context *gin.Context) {
	var event models.Event
	err := context.ShouldBindJSON(&event)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"message": "Could not parse data"})
		return
	}

	if event.TicketsAvailable < 0 {
		context.JSON(http.StatusBadRequest, gin.H{"message": "TicketsAvailable cannot be negative"})
		return
	}

	userId := context.GetInt64("userId")
	event.UserID = userId

	err = event.Save()
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"message": "Could not create events"})
		return
	}

	context.JSON(http.StatusCreated, gin.H{"message": "Event created successfully", "event": event})
}

func GetEvent(context *gin.Context) {
	eventId, ok := parseEventID(context)
	if !ok {
		return
	}

	event, ok := getEventByID(context, eventId)
	if !ok {
		return
	}

	context.JSON(http.StatusOK, event)
}

func UpdateEvent(context *gin.Context) {
	eventId, ok := parseEventID(context)
	if !ok {
		return
	}

	userId := context.GetInt64("userId")
	event, ok := getEventByID(context, eventId)
	if !ok {
		return
	}

	if !checkEventAuthorization(context, event, userId, "update") {
		return
	}

	var updateEvent models.Event
	err := context.ShouldBindJSON(&updateEvent)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"message": "Could not parse data"})
		return
	}

	updateEvent.ID = eventId
	if updateEvent.TicketsAvailable < 0 {
		context.JSON(http.StatusBadRequest, gin.H{"message": "TicketsAvailable cannot be negative"})
		return
	}
	err = updateEvent.Update()
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"message": "Could not update event"})
		return
	}

	context.JSON(http.StatusOK, gin.H{"message": "Event updated successfully"})
}

func DeleteEvent(context *gin.Context) {
	eventId, ok := parseEventID(context)
	if !ok {
		return
	}

	userId := context.GetInt64("userId")
	event, ok := getEventByID(context, eventId)
	if !ok {
		return
	}

	if !checkEventAuthorization(context, event, userId, "delete") {
		return
	}

	err := event.Delete()
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"message": "Could not delete event"})
		return
	}

	context.JSON(http.StatusOK, gin.H{"message": "Event deleted successfully"})
}

type ticketUpdateRequest struct {
	TicketsAvailable int64 `json:"TicketsAvailable" binding:"required,gte=0"`
}

func UpdateEventTicketCount(context *gin.Context) {
	eventId, ok := parseEventID(context)
	if !ok {
		return
	}

	userId := context.GetInt64("userId")
	event, ok := getEventByID(context, eventId)
	if !ok {
		return
	}

	if !checkEventAuthorization(context, event, userId, "update ticket count for") {
		return
	}

	var payload ticketUpdateRequest
	if err := context.ShouldBindJSON(&payload); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"message": "Could not parse data"})
		return
	}

	err := models.UpdateEventTickets(eventId, payload.TicketsAvailable)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"message": "Could not update ticket count"})
		return
	}

	context.JSON(http.StatusOK, gin.H{
		"message":          "Ticket count updated successfully",
		"ticketsAvailable": payload.TicketsAvailable,
		"eventId":          eventId,
	})
}
