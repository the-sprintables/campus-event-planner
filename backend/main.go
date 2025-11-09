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

	// Enable CORS so React frontend can call API
	// Use AllowOriginFunc for more flexible origin checking
	server.Use(cors.New(cors.Config{
		AllowOriginFunc: func(origin string) bool {
			// Allow localhost with common development ports
			allowedOrigins := []string{
				"http://localhost:5173",
				"http://localhost:5174",
				"http://localhost:3000",
				"http://127.0.0.1:5173",
				"http://127.0.0.1:5174",
				"http://127.0.0.1:3000",
			}
			for _, allowed := range allowedOrigins {
				if origin == allowed {
					return true
				}
			}
			return false
		},
		AllowMethods:     []string{"POST", "GET", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "Access-Control-Request-Method", "Access-Control-Request-Headers"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	routes.RegisterRoutes(server)

	server.Run(":8080") // localhost:8080
}
