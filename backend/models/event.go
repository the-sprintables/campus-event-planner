package models

import (
	"database/sql"
	"errors"
	"event-planner/db"
	"time"
)

type Event struct {
	ID               int64     `json:"ID"`
	Name             string    `json:"Name" binding:"required"`
	Description      string    `json:"Description" binding:"required"`
	Location         string    `json:"Location" binding:"required"`
	DateTime         time.Time `json:"DateTime" binding:"required"`
	UserID           int64     `json:"UserID"`
	ImageData        string    `json:"ImageData,omitempty"`
	Color            string    `json:"Color,omitempty"`
	Price            *float64  `json:"Price,omitempty"`
	Priority         string    `json:"Priority,omitempty"`
	TicketsAvailable int64     `json:"TicketsAvailable" binding:"required,gte=0"`
	EventType        string    `json:"eventType,omitempty"`
}

var events = []Event{}

func parseDateTime(dateTimeStr sql.NullString) time.Time {
	if !dateTimeStr.Valid {
		return time.Now()
	}

	dtStr := dateTimeStr.String
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
	return time.Now()
}

func populateNullableFields(event *Event, imageData, color, priority sql.NullString, price sql.NullFloat64, eventType sql.NullString) {
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
	if eventType.Valid {
		event.EventType = eventType.String
	}
}

func scanEventFromRow(event *Event, dateTimeStr sql.NullString, imageData, color, priority sql.NullString, price sql.NullFloat64, eventType sql.NullString) {
	event.DateTime = parseDateTime(dateTimeStr)
	populateNullableFields(event, imageData, color, priority, price, eventType)
}

func (e *Event) Save() error {
	query := `
	INSERT INTO events (name, description, location, dateTime, userID, imageData, color, price, priority, ticketsAvailable, event_type)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	stmt, err := db.DB.Prepare(query)
	if err != nil {
		return err
	}

	defer stmt.Close()
	result, err := stmt.Exec(e.Name, e.Description, e.Location, e.DateTime, e.UserID, e.ImageData, e.Color, e.Price, e.Priority, e.TicketsAvailable, e.EventType)
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	e.ID = id
	return err
}

func GetAllEvents() ([]Event, error) {
	query := "SELECT id, name, description, location, dateTime, userID, imageData, color, price, event_type, priority, ticketsAvailable FROM events"
	rows, err := db.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []Event

	for rows.Next() {
		var event Event
		var imageData, color, priority, eventType sql.NullString
		var price sql.NullFloat64
		var dateTimeStr sql.NullString
		err := rows.Scan(&event.ID, &event.Name, &event.Description, &event.Location, &dateTimeStr, &event.UserID, &imageData, &color, &price, &eventType, &priority, &event.TicketsAvailable)

		if err != nil {
			return nil, err
		}

		scanEventFromRow(&event, dateTimeStr, imageData, color, priority, price, eventType)
		events = append(events, event)
	}
	return events, nil
}

func GetEventByID(id int64) (*Event, error) {
	query := "SELECT id, name, description, location, dateTime, userID, imageData, color, price, event_type, priority, ticketsAvailable FROM events WHERE id = ?"
	row := db.DB.QueryRow(query, id)

	var event Event
	var imageData, color, priority, eventType sql.NullString
	var price sql.NullFloat64
	var dateTimeStr sql.NullString
	err := row.Scan(&event.ID, &event.Name, &event.Description, &event.Location, &dateTimeStr, &event.UserID, &imageData, &color, &price, &eventType, &priority, &event.TicketsAvailable)
	if err != nil {
		return nil, err
	}

	scanEventFromRow(&event, dateTimeStr, imageData, color, priority, price, eventType)
	return &event, nil
}

func (event Event) Update() error {
	query := `
	UPDATE events
	SET name = ?, description = ?, location = ?, dateTime = ?, imageData = ?, color = ?, price = ?, priority = ?, ticketsAvailable = ?, event_type = ?
	WHERE id = ?`

	stmt, err := db.DB.Prepare(query)

	if err != nil {
		return err
	}

	defer stmt.Close()

	_, err = stmt.Exec(event.Name, event.Description, event.Location, event.DateTime, event.ImageData, event.Color, event.Price, event.Priority, event.TicketsAvailable, event.EventType, event.ID)
	return err
}

func UpdateEventTickets(eventID int64, ticketsAvailable int64) error {
	if ticketsAvailable < 0 {
		return errors.New("ticket count cannot be negative")
	}

	query := `
	UPDATE events
	SET ticketsAvailable = ?
	WHERE id = ?`

	stmt, err := db.DB.Prepare(query)
	if err != nil {
		return err
	}

	defer stmt.Close()

	_, err = stmt.Exec(ticketsAvailable, eventID)
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
	checkQuery := `
	SELECT COUNT(*) FROM registrations
	WHERE event_id = ? AND user_id = ?`

	var count int
	err := db.DB.QueryRow(checkQuery, e.ID, userID).Scan(&count)
	if err != nil {
		return err
	}

	if count > 0 {
		return errors.New("User already registered for this event")
	}

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
	checkQuery := `
	SELECT COUNT(*) FROM registrations
	WHERE event_id = ? AND user_id = ?`

	var count int
	err := db.DB.QueryRow(checkQuery, e.ID, userID).Scan(&count)
	if err != nil {
		return err
	}

	if count == 0 {
		return errors.New("Event does not exist or has already been cancelled")
	}

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

func IsUserRegisteredForEvent(eventID int64, userID int64) (bool, error) {
	query := `
	SELECT COUNT(*) FROM registrations
	WHERE event_id = ? AND user_id = ?`

	var count int
	err := db.DB.QueryRow(query, eventID, userID).Scan(&count)
	if err != nil {
		return false, err
	}

	return count > 0, nil
}
