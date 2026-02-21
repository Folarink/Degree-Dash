// init-new-db.js
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Path to your new database
const dbPath = path.join(__dirname, 'DegreeDashDatabase_new.db');
console.log('Creating new database at:', dbPath);

// Complete schema for Microsoft Authentication with multiple professor support
const schema = `
-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- Users table (simplified for Microsoft OAuth)
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    microsoft_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

-- Courses table (removed instructor field since we have course_professors)
CREATE TABLE courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_code TEXT UNIQUE NOT NULL,
    course_name TEXT NOT NULL,
    department TEXT NOT NULL,
    credits INTEGER NOT NULL DEFAULT 3,
    description TEXT,
    prerequisites TEXT,
    schedule TEXT,
    semester TEXT,
    year INTEGER,
    capacity INTEGER DEFAULT 30,
    enrolled INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Professors table
CREATE TABLE professors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    department TEXT,
    email TEXT,
    office TEXT,
    UNIQUE(name, department)
);

-- Junction table for courses and professors (many-to-many)
CREATE TABLE course_professors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    professor_id INTEGER NOT NULL,
    role TEXT DEFAULT 'Instructor',
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (professor_id) REFERENCES professors(id) ON DELETE CASCADE,
    UNIQUE(course_id, professor_id)
);

-- Enrollments table (tracks which students are in which courses)
CREATE TABLE enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'enrolled',
    grade TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE(user_id, course_id)
);

-- Reviews table
CREATE TABLE reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    professor_id INTEGER,
    semester_taken TEXT,
    year_taken INTEGER,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    difficulty INTEGER CHECK (difficulty >= 1 AND difficulty <= 5),
    comment TEXT,
    would_recommend BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (professor_id) REFERENCES professors(id) ON DELETE SET NULL,
    UNIQUE(user_id, course_id, professor_id, semester_taken, year_taken)
);

-- Indexes for performance
CREATE INDEX idx_users_microsoft ON users(microsoft_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_courses_code ON courses(course_code);
CREATE INDEX idx_courses_department ON courses(department);
CREATE INDEX idx_courses_semester ON courses(semester, year);
CREATE INDEX idx_course_professors_course ON course_professors(course_id);
CREATE INDEX idx_course_professors_professor ON course_professors(professor_id);
CREATE INDEX idx_enrollments_user ON enrollments(user_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_reviews_course ON reviews(course_id);
CREATE INDEX idx_reviews_professor ON reviews(professor_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_professors_name ON professors(name);

-- View for course statistics (updated to show multiple professors)
CREATE VIEW course_stats AS
SELECT 
    c.id,
    c.course_code,
    c.course_name,
    c.department,
    c.credits,
    c.capacity,
    c.enrolled,
    (c.capacity - c.enrolled) as seats_available,
    c.schedule,
    c.semester,
    c.year,
    GROUP_CONCAT(p.name, ', ') as instructors,
    COUNT(DISTINCT cp.professor_id) as instructor_count,
    COUNT(DISTINCT r.id) as review_count,
    AVG(r.rating) as avg_rating,
    AVG(r.difficulty) as avg_difficulty,
    SUM(CASE WHEN r.would_recommend THEN 1 ELSE 0 END) * 1.0 / NULLIF(COUNT(r.id), 0) as recommend_rate
FROM courses c
LEFT JOIN course_professors cp ON c.id = cp.course_id
LEFT JOIN professors p ON cp.professor_id = p.id
LEFT JOIN reviews r ON c.id = r.course_id
GROUP BY c.id;

-- View for course details with professor list
CREATE VIEW course_details AS
SELECT 
    c.*,
    GROUP_CONCAT(p.name, ', ') as instructors,
    COUNT(DISTINCT cp.professor_id) as instructor_count
FROM courses c
LEFT JOIN course_professors cp ON c.id = cp.course_id
LEFT JOIN professors p ON cp.professor_id = p.id
GROUP BY c.id;

-- View for user enrollment details
CREATE VIEW user_enrollments AS
SELECT 
    u.id as user_id,
    u.email,
    u.name,
    c.id as course_id,
    c.course_code,
    c.course_name,
    c.department,
    e.enrolled_at,
    e.status,
    e.grade
FROM users u
JOIN enrollments e ON u.id = e.user_id
JOIN courses c ON e.course_id = c.id;
`;

// Delete old database if it exists
try {
    if (fs.existsSync(dbPath)) {
        console.log('Old database found, removing it...');
        fs.unlinkSync(dbPath);
        console.log('Old database removed');
    }
} catch (err) {
    console.log('Could not remove old database:', err.message);
}

// Create new database and run schema
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error creating database:', err.message);
        return;
    }
    console.log('New database file created successfully');
    
    // Execute schema
    db.exec(schema, (err) => {
        if (err) {
            console.error('Error creating schema:', err);
        } else {
            console.log(' Database schema created successfully!');
            console.log('\nTables created:');
            console.log('  - users');
            console.log('  - courses');
            console.log('  - professors');
            console.log('  - course_professors (NEW - enables multiple professors per course)');
            console.log('  - enrollments');
            console.log('  - reviews');
            console.log('\nViews created:');
            console.log('  - course_stats (shows all professors)');
            console.log('  - course_details');
            console.log('  - user_enrollments');
        }
    

        // Verify tables were created
        db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
            if (err) {
                console.error('Error verifying tables:', err);
            } else {
                console.log('\n  Verified tables in database:');
                tables.forEach(table => {
                    console.log('   - ' + table.name);
                });
            }            
            // Close database
            db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                } else {
                    console.log('\n Database initialization complete!');
                    console.log('Next step: Run node seed-new.js to add sample data');
                }
            });
        });
    });
});
