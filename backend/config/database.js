// backend/config/database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Define path to database file
const dbPath = path.join(__dirname, '..', 'database', 'DegreeDashDatabase_new.db');
console.log('Database path:', dbPath);

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to SQLite database successfully!');
        
        // Enable foreign keys
        db.run('PRAGMA foreign_keys = ON', (err) => {
            if (err) {
                console.error('Error enabling foreign keys:', err);
            }
        });
    }
});

// Create courses table if it doesn't exist
const initializeTables = () => {
    const createCoursesTable = `
        CREATE TABLE IF NOT EXISTS courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            department TEXT NOT NULL,
            credits INTEGER NOT NULL DEFAULT 3,
            instructor TEXT NOT NULL DEFAULT 'TBA',
            description TEXT NOT NULL,
            prerequisites TEXT,
            schedule TEXT,
            semester TEXT,
            year INTEGER,
            capacity INTEGER DEFAULT 30,
            enrolled INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;

    db.run(createCoursesTable, (err) => {
        if (err) {
            console.error('Error creating courses table:', err.message);
        } else {
            console.log('Courses table ready');
        }
    });
};

// Run initialization
initializeTables();

// Promise wrapper for SQLite methods
const runAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ 
                    id: this.lastID, 
                    changes: this.changes 
                });
            }
        });
    });
};

const getAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
};

const allAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

// Close database connection (for graceful shutdown)
const closeDb = () => {
    return new Promise((resolve, reject) => {
        db.close((err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

// Export everything
module.exports = {
    db,
    runAsync,
    getAsync,
    allAsync,
    closeDb
};
