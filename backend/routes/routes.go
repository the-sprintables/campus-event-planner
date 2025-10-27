package routes

import (
	"event-planner/middlewares"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(server *gin.Engine) {

	authenticated := server.Group("/")
	authenticated.Use(middlewares.Authenticate)

	server.POST("/signup", signup)
	server.POST("/login", login)
}
