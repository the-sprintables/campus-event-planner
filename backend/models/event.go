package models

import (
	"database/sql"
	"event-planner/db"
	"time"
)

type Event struct {
	ID          int64     `json:"ID"`
	Name        string    `json:"Name" binding:"required"`
	Description string    `json:"Description" binding:"required"`
	Location    string    `json:"Location" binding:"required"`
	DateTime    time.Time `json:"DateTime" binding:"required"`
	UserID      int64     `json:"UserID"`
	ImageData   string    `json:"ImageData,omitempty"`
	Color       string    `json:"Color,omitempty"`
	Price       *float64  `json:"Price,omitempty"`
	Priority    string    `json:"Priority,omitempty"`
}

var events = []Event{}

// parseDateTime parses a SQLite datetime string to time.Time
// SQLite stores datetime as TEXT, so we try multiple formats
func parseDateTime(dateTimeStr sql.NullString) time.Time {
	if !dateTimeStr.Valid {
		return time.Now()
	}

	dtStr := dateTimeStr.String
	// Try parsing with timezone offset (handles both + and -)
	if t, err := time.Parse("2006-01-02 15:04:05-07:00", dtStr); err == nil {
		return t
	}
	if t, err := time.Parse("2006-01-02 15:04:05+07:00", dtStr); err == nil {
		return t
	}
	if t, err := time.Parse(time.RFC3339, dtStr); err == nil {
		return t
	}
	if t, err := time.Parse("2006-01-02T15:04:05Z", dtStr); err == nil {
		return t
	}
	if t, err := time.Parse("2006-01-02T15:04:05-07:00", dtStr); err == nil {
		return t
	}
	if t, err := time.ParseInLocation("2006-01-02 15:04:05", dtStr, time.UTC); err == nil {
		return t
	}
	if t, err := time.Parse("2006-01-02 15:04:05", dtStr); err == nil {
		return t
	}
	// Fallback to current time if all parsing fails
	return time.Now()
}

// populateNullableFields populates event nullable fields from SQL null types
func populateNullableFields(event *Event, imageData, color, priority sql.NullString, price sql.NullFloat64) {
	if imageData.Valid {
		event.ImageData = imageData.String
	}
	if color.Valid {
		event.Color = color.String
	}
	if price.Valid {
		event.Price = &price.Float64
	}
	if priority.Valid {
		event.Priority = priority.String
	}
}

// scanEventFromRow scans a database row into an Event struct
func scanEventFromRow(event *Event, dateTimeStr sql.NullString, imageData, color, priority sql.NullString, price sql.NullFloat64) {
	event.DateTime = parseDateTime(dateTimeStr)
	populateNullableFields(event, imageData, color, priority, price)
}

func (e *Event) Save() error {
	query := `
	INSERT INTO events (name, description, location, dateTime, userID, imageData, color, price, priority)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`

	stmt, err := db.DB.Prepare(query)
	if err != nil {
		return err
	}

	defer stmt.Close()
	result, err := stmt.Exec(e.Name, e.Description, e.Location, e.DateTime, e.UserID, e.ImageData, e.Color, e.Price, e.Priority)
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	e.ID = id
	return err
}

func GetAllEvents() ([]Event, error) {
	// Explicitly list columns to ensure correct order
	query := "SELECT id, name, description, location, dateTime, userID, imageData, color, price, priority FROM events"
	rows, err := db.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []Event

	for rows.Next() {
		var event Event
		var imageData, color, priority sql.NullString
		var price sql.NullFloat64
		var dateTimeStr sql.NullString
		err := rows.Scan(&event.ID, &event.Name, &event.Description, &event.Location, &dateTimeStr, &event.UserID, &imageData, &color, &price, &priority)

		if err != nil {
			return nil, err
		}

		scanEventFromRow(&event, dateTimeStr, imageData, color, priority, price)
		events = append(events, event)
	}
	return events, nil
}

func GetEventByID(id int64) (*Event, error) {
	// Explicitly list columns to ensure correct order
	query := "SELECT id, name, description, location, dateTime, userID, imageData, color, price, priority FROM events WHERE id = ?"
	row := db.DB.QueryRow(query, id)

	var event Event
	var imageData, color, priority sql.NullString
	var price sql.NullFloat64
	var dateTimeStr sql.NullString
	err := row.Scan(&event.ID, &event.Name, &event.Description, &event.Location, &dateTimeStr, &event.UserID, &imageData, &color, &price, &priority)
	if err != nil {
		return nil, err
	}

	scanEventFromRow(&event, dateTimeStr, imageData, color, priority, price)
	return &event, nil
}

func (event Event) Update() error {
	query := `
	UPDATE events
	SET name = ?, description = ?, location = ?, dateTime = ?, imageData = ?, color = ?, price = ?, priority = ?
	WHERE id = ?`

	stmt, err := db.DB.Prepare(query)

	if err != nil {
		return err
	}

	defer stmt.Close()

	_, err = stmt.Exec(event.Name, event.Description, event.Location, event.DateTime, event.ImageData, event.Color, event.Price, event.Priority, event.ID)
	return err
}

func (event Event) Delete() error {
	query := "DELETE FROM events WHERE id = ?"
	stmt, err := db.DB.Prepare(query)
	if err != nil {
		return err
	}

	defer stmt.Close()
	_, err = stmt.Exec(event.ID)
	return err
}

func (e Event) Register(userID int64) error {
	query := `
	INSERT INTO registrations (event_id, user_id)
	VALUES (?, ?)`
	stmt, err := db.DB.Prepare(query)

	if err != nil {
		return err
	}

	defer stmt.Close()

	_, err = stmt.Exec(e.ID, userID)
	return err
}

func (e Event) CancelRegistration(userID int64) error {
	query := `
	DELETE FROM registrations
	WHERE event_id = ? AND user_id = ?`

	stmt, err := db.DB.Prepare(query)

	if err != nil {
		return err
	}

	defer stmt.Close()

	_, err = stmt.Exec(e.ID, userID)
	return err
}
