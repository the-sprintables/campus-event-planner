package routes

import (
	"event-planner/middlewares"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(server *gin.Engine) {
	server.GET("/events", GetEvents)
	server.GET("/events/:id", GetEvent)

	authenticated := server.Group("/")
	authenticated.Use(middlewares.Authenticate)
	authenticated.POST("/events", CreateEvent)
	// Register more specific routes first to avoid route matching conflicts
	authenticated.GET("/events/:id/registration/status", getRegistrationStatus)
	authenticated.POST("/events/:id/register", registerForEvent)
	authenticated.DELETE("/events/:id/register", cancelRegistration)
	authenticated.PUT("/events/:id/tickets", UpdateEventTicketCount)
	// General event routes registered after specific ones
	authenticated.PUT("/events/:id", UpdateEvent)
	authenticated.DELETE("/events/:id", DeleteEvent)
	authenticated.PUT("/users/password", updatePassword)

	server.POST("/signup", signup)
	server.POST("/login", login)
}
