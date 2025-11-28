package db

import (
	"database/sql"
	"event-planner/utils"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

func InitDB() {
	var err error
	DB, err = sql.Open("sqlite3", "api.db")

	if err != nil {
		panic(err)
	}

	DB.SetMaxOpenConns(10)
	DB.SetMaxIdleConns(5)

	createTables()
}

func createTables() {
	createUsersTable := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		email TEXT NOT NULL UNIQUE,
		password TEXT NOT NULL,
		role TEXT DEFAULT 'user'
	);
	`
	_, err := DB.Exec(createUsersTable)

	if err != nil {
		panic("Could not create users table")
	}

	createEventsTable := `
	CREATE TABLE IF NOT EXISTS events (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		description TEXT NOT NULL,
		location TEXT NOT NULL,
		dateTime DATETIME NOT NULL,
		userID INTEGER,
		imageData TEXT,
		color TEXT,
		price REAL,
		priority TEXT,
		ticketsAvailable INTEGER NOT NULL DEFAULT 0,
		FOREIGN KEY (userID) REFERENCES users(id)
	);
	`
	_, err = DB.Exec(createEventsTable)

	if err != nil {
		panic(err)
	}

	createRegistrationsTable := `
	CREATE TABLE IF NOT EXISTS registrations (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		event_id INTEGER,
		user_id INTEGER,
		FOREIGN KEY (event_id) REFERENCES events(id),
		FOREIGN KEY (user_id) REFERENCES users(id)
	);
	`
	_, err = DB.Exec(createRegistrationsTable)

	if err != nil {
		panic("Could not create registrations table")
	}

	migrateEventsTable()
	migrateUsersTable()
	migrateRegistrationsTable()

	createDefaultAdmin()
}

func createDefaultAdmin() {
	_, _ = DB.Exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'")

	var count int
	err := DB.QueryRow("SELECT COUNT(*) FROM users WHERE email = ?", "admin@email.com").Scan(&count)
	if err != nil {
		return
	}

	if count == 0 {
		hashedPassword, err := utils.HashPassword("admin")
		if err != nil {
			return
		}

		_, err = DB.Exec("INSERT INTO users (email, password, role) VALUES (?, ?, ?)",
			"admin@email.com", hashedPassword, "admin")
		if err != nil {
			return
		}
	} else {
		_, _ = DB.Exec("UPDATE users SET role = 'admin' WHERE email = ? AND (role IS NULL OR role != 'admin')",
			"admin@email.com")
	}
}

func migrateEventsTable() {
	_, _ = DB.Exec("ALTER TABLE events ADD COLUMN imageData TEXT")
	_, _ = DB.Exec("ALTER TABLE events ADD COLUMN color TEXT")
	_, _ = DB.Exec("ALTER TABLE events ADD COLUMN price REAL")
	_, _ = DB.Exec("ALTER TABLE events ADD COLUMN priority TEXT")
	_, _ = DB.Exec("ALTER TABLE events ADD COLUMN ticketsAvailable INTEGER NOT NULL DEFAULT 0")
	_, _ = DB.Exec("ALTER TABLE events ADD COLUMN event_type TEXT")
}

func migrateUsersTable() {
	_, _ = DB.Exec("ALTER TABLE users ADD COLUMN name TEXT")
	_, _ = DB.Exec("ALTER TABLE users ADD COLUMN preferred_event_types TEXT")
}

func migrateRegistrationsTable() {
	// Add quantity column if it doesn't exist
	// SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we ignore errors
	// The error will be ignored if column already exists
	_, _ = DB.Exec("ALTER TABLE registrations ADD COLUMN quantity INTEGER DEFAULT 1")
	// Update any NULL quantities to 1 (for existing records)
	_, _ = DB.Exec("UPDATE registrations SET quantity = 1 WHERE quantity IS NULL")
}
