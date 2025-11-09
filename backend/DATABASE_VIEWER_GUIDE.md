# Viewing SQLite Database with DBeaver

This guide explains how to view and interact with the SQLite database (`api.db`) using DBeaver, a free and open-source universal database tool.

---

## Prerequisites

- DBeaver Community Edition (free)
- The database file located at: `backend/api.db`

---

## Installation

### Step 1: Download DBeaver

1. Visit the DBeaver download page: https://dbeaver.io/download/
2. Download **DBeaver Community Edition** for macOS
3. Install the application by dragging it to your Applications folder

---

## Connecting to the Database

### Step 1: Open DBeaver

Launch DBeaver from your Applications folder.

### Step 2: Create a New Database Connection

1. Click on the **"New Database Connection"** button in the toolbar (plug icon)
   - Or go to: **Database** → **New Database Connection**
   - Or use keyboard shortcut: `Cmd + Shift + N`

### Step 3: Select SQLite

1. In the connection type selection window, search for **"SQLite"**
2. Select **SQLite** from the list
3. Click **Next**

### Step 4: Configure the Connection

1. In the **Path** field, click the **Browse** button (folder icon)
2. Navigate to your project directory:
   ```
   /Users/mac/Documents/TUS/Agile Build & Delivery/campus-event-planner/backend/
   ```
3. Select the file: **`api.db`**
4. (Optional) Give your connection a name in the **Connection name** field (e.g., "Campus Event Planner DB")
5. Click **Test Connection** to verify the connection works
6. If successful, click **Finish**

---

## Viewing Your Database

### Database Structure

Once connected, you'll see the database in the **Database Navigator** panel on the left side. Expand it to see:

- **Tables** folder containing:
  - `events` - Event information
  - `registrations` - User event registrations
  - `users` - User accounts

### Viewing Table Data

1. **Expand the Tables folder** in the Database Navigator
2. **Right-click on any table** (e.g., `users`, `events`, `registrations`)
3. Select **"View Data"** or **"Open Data"**
4. The table data will appear in a new tab

### Viewing Table Structure

1. **Right-click on a table** in the Database Navigator
2. Select **"Properties"** or **"View Definition"**
3. This shows the table schema, columns, data types, and constraints

---

## Running SQL Queries

### Step 1: Open SQL Editor

1. **Right-click on your database connection** in the Database Navigator
2. Select **"SQL Editor"** → **"New SQL Script"**
   - Or use keyboard shortcut: `Cmd + .`

### Step 2: Write and Execute Queries

Example queries you can run:

```sql
-- View all users
SELECT * FROM users;

-- View all events
SELECT * FROM events;

-- View all registrations
SELECT * FROM registrations;

-- View events with user information
SELECT e.*, u.email as creator_email 
FROM events e 
LEFT JOIN users u ON e.userID = u.id;

-- Count events by user
SELECT u.email, COUNT(e.id) as event_count
FROM users u
LEFT JOIN events e ON u.id = e.userID
GROUP BY u.id, u.email;
```

### Step 3: Execute the Query

1. Click the **"Execute SQL Script"** button (play icon) in the toolbar
   - Or use keyboard shortcut: `Cmd + Enter`
2. Results will appear in the **Data** tab below

---

## Useful Features

### 1. Data Export

- **Right-click on a table** → **"Export Data"**
- Choose format (CSV, Excel, JSON, etc.)
- Export your data for analysis or backup

### 2. Data Import

- **Right-click on a table** → **"Import Data"**
- Import data from CSV, Excel, or other formats

### 3. Edit Data Directly

- Open a table in **"View Data"** mode
- Click on any cell to edit (be careful with production data!)
- Changes are saved when you commit the transaction

### 4. ER Diagram

- **Right-click on your database** → **"View Diagram"**
- Visualize relationships between tables

### 5. Generate SQL Scripts

- **Right-click on a table** → **"Generate SQL"** → **"INSERT"** or **"SELECT"**
- Generate SQL scripts automatically

---

## Database Schema Reference

### Users Table
- `id` - INTEGER (Primary Key, Auto-increment)
- `email` - TEXT (Unique, Not Null)
- `password` - TEXT (Not Null, Hashed)
- `role` - TEXT (Default: 'user', can be 'admin')

### Events Table
- `id` - INTEGER (Primary Key, Auto-increment)
- `name` - TEXT (Not Null)
- `description` - TEXT (Not Null)
- `location` - TEXT (Not Null)
- `dateTime` - DATETIME (Not Null)
- `userID` - INTEGER (Foreign Key → users.id)
- `imageData` - TEXT (Optional)
- `color` - TEXT (Optional)
- `price` - REAL (Optional)
- `priority` - TEXT (Optional)

### Registrations Table
- `id` - INTEGER (Primary Key, Auto-increment)
- `event_id` - INTEGER (Foreign Key → events.id)
- `user_id` - INTEGER (Foreign Key → users.id)

---

## Tips and Best Practices

1. **Read-Only Mode**: For safety, you can set the connection to read-only:
   - Right-click connection → **"Edit Connection"** → **"Connection Settings"** → Check **"Read-only"**

2. **Backup Before Changes**: Always backup your database before making manual changes:
   - Right-click database → **"Tools"** → **"Backup Database"**

3. **Connection Persistence**: DBeaver saves your connection, so you can quickly reconnect later from the Database Navigator.

4. **Keyboard Shortcuts**:
   - `Cmd + Enter` - Execute SQL
   - `Cmd + .` - New SQL Script
   - `Cmd + /` - Comment/Uncomment SQL

---

## Troubleshooting

### Connection Issues

- **"Database file is locked"**: Make sure the backend server is not running, or close any other database connections
- **"File not found"**: Verify the path to `api.db` is correct
- **"Permission denied"**: Check file permissions on `api.db`

### Viewing Issues

- **Empty tables**: This is normal if no data has been inserted yet
- **Can't see tables**: Refresh the connection (right-click → **"Refresh"**)

---

## Additional Resources

- DBeaver Documentation: https://dbeaver.com/docs/
- SQLite Documentation: https://www.sqlite.org/docs.html
- SQL Tutorial: https://www.w3schools.com/sql/

---

## Quick Start Summary

1. Install DBeaver Community Edition
2. Create new connection → Select SQLite
3. Browse to `backend/api.db`
4. Test and finish connection
5. Expand Tables → Right-click table → View Data
6. Use SQL Editor for custom queries

---

**Happy Database Exploring!** 🗄️

