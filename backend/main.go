package main

import (
	"event-planner/db"
	"event-planner/routes"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	db.InitDB()
	server := gin.Default()

	// ✅ Enable CORS so React frontend can call API
	server.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://localhost:3000", "http://localhost:5174"},
		AllowMethods:     []string{"POST", "GET", "OPTIONS", "DELETE", "UPDATE"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	routes.RegisterRoutes(server)

	server.Run(":8080") // localhost:8080
}
