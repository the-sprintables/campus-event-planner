package utils

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt"
)

const secretKey = "supersecretkey"

func GenerateToken(userID int64, email string) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"userId": userID,
		"email":  email,
		"exp":    time.Now().Add(time.Hour * 2).Unix(),
	})

	return token.SignedString([]byte(secretKey))

}

func VerifyToken(token string) (int64, error) {
	parsedToken, err := jwt.Parse(token, func(token *jwt.Token) (interface{}, error) {
		_, ok := token.Method.(*jwt.SigningMethodHMAC)

		if !ok {
			return nil, errors.New("Unexpected Sign in method")
		}
		return []byte(secretKey), nil
	})

	if err != nil {
		return 0, errors.New("Could not parse")
	}

	tokenIsValid := parsedToken.Valid

	if !tokenIsValid {
		return 0, errors.New("Token is not valid")
	}

	claims, ok := parsedToken.Claims.(jwt.MapClaims)

	if !ok {
		return 0, errors.New("Could not parse claims")
	}

	// Check if userId exists in claims
	userIdValue, exists := claims["userId"]
	if !exists {
		return 0, errors.New("userId not found in claims")
	}

	// Safely convert userId to int64
	userIdFloat, ok := userIdValue.(float64)
	if !ok {
		return 0, errors.New("userId is not a valid number")
	}

	userId := int64(userIdFloat)

	return userId, nil
}
