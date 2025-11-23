package models

import (
	"errors"
	"event-planner/db"
	"event-planner/utils"
)

type User struct {
	ID                  int64
	Email               string `binding:"required"`
	Password            string `binding:"required"`
	Role                string
	Name                string
	PreferredEventTypes string // Comma-separated list of event types
}

func (u User) Save() error {
	query := `
	INSERT INTO users (email, password, role, name)
	VALUES (?, ?, ?, ?)`
	stmt, err := db.DB.Prepare(query)

	if err != nil {
		return err
	}

	defer stmt.Close()

	hashedPassword, err := utils.HashPassword(u.Password)

	if err != nil {
		return err
	}

	// Default role to 'user' if not specified
	role := u.Role
	if role == "" {
		role = "user"
	}

	result, err := stmt.Exec(u.Email, hashedPassword, role, u.Name)

	if err != nil {
		return err
	}

	userId, err := result.LastInsertId()
	u.ID = userId
	return err
}

func (u *User) ValidateCredentials() error {
	query := "SELECT id, password, COALESCE(role, 'user') FROM users WHERE email = ?"

	row := db.DB.QueryRow(query, u.Email)

	var retrievedPassword string
	err := row.Scan(&u.ID, &retrievedPassword, &u.Role)

	if err != nil {
		return errors.New("Invalid credentials")
	}

	passwordIsValid := utils.CheckPasswordHash(u.Password, retrievedPassword)

	if !passwordIsValid {
		return errors.New("Invalid credentials")
	}

	// Default role to 'user' if not set
	if u.Role == "" {
		u.Role = "user"
	}

	return nil
}

func (u *User) UpdatePassword(newPassword string) error {
	hashedPassword, err := utils.HashPassword(newPassword)
	if err != nil {
		return err
	}

	query := "UPDATE users SET password = ? WHERE id = ?"
	stmt, err := db.DB.Prepare(query)
	if err != nil {
		return err
	}
	defer stmt.Close()

	_, err = stmt.Exec(hashedPassword, u.ID)
	return err
}

func GetUserByID(id int64) (*User, error) {
	query := "SELECT id, email, COALESCE(role, 'user'), COALESCE(name, ''), COALESCE(preferred_event_types, '') FROM users WHERE id = ?"
	row := db.DB.QueryRow(query, id)

	var user User
	err := row.Scan(&user.ID, &user.Email, &user.Role, &user.Name, &user.PreferredEventTypes)
	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (u *User) UpdateProfile(name string, preferredEventTypes string) error {
	query := "UPDATE users SET name = ?, preferred_event_types = ? WHERE id = ?"
	stmt, err := db.DB.Prepare(query)
	if err != nil {
		return err
	}
	defer stmt.Close()

	_, err = stmt.Exec(name, preferredEventTypes, u.ID)
	return err
}
