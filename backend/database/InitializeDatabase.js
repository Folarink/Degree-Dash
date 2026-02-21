// init-new-db.js
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Path to your new database
const dbPath = path.join(__dirname, 'DegreeDashDatabase_new.db');
console.log('Using database at:', dbPath);

// Create database directory if it doesn't exist
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Complete schema with IF NOT EXISTS for all tables
const schema = `
-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- Users table with student/alumni support
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    microsoft_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    user_type TEXT DEFAULT 'current' CHECK (user_type IN ('current', 'alumni')),
    graduation_year INTEGER,
    major TEXT,
    enrollment_year INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Professors table
CREATE TABLE IF NOT EXISTS professors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    department TEXT,
    email TEXT,
    office TEXT,
    bio TEXT,
    website TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, department)
);

-- Junction table for courses and professors
CREATE TABLE IF NOT EXISTS course_professors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    professor_id INTEGER NOT NULL,
    role TEXT DEFAULT 'Instructor',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (professor_id) REFERENCES professors(id) ON DELETE CASCADE,
    UNIQUE(course_id, professor_id)
);

-- Enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'dropped', 'completed', 'auditing')),
    grade TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE(user_id, course_id)
);

-- Alumni network table
CREATE TABLE IF NOT EXISTS alumni_network (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    current_employer TEXT,
    job_title TEXT,
    industry TEXT,
    location TEXT,
    linkedin_url TEXT,
    mentorship_available BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
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

-- Indexes (CREATE INDEX IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_users_microsoft ON users(microsoft_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_graduation ON users(graduation_year);
CREATE INDEX IF NOT EXISTS idx_users_major ON users(major);
CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(course_code);
CREATE INDEX IF NOT EXISTS idx_courses_department ON courses(department);
CREATE INDEX IF NOT EXISTS idx_courses_semester ON courses(semester, year);
CREATE INDEX IF NOT EXISTS idx_course_professors_course ON course_professors(course_id);
CREATE INDEX IF NOT EXISTS idx_course_professors_professor ON course_professors(professor_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);
CREATE INDEX IF NOT EXISTS idx_reviews_course ON reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_reviews_professor ON reviews(professor_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_professors_name ON professors(name);
CREATE INDEX IF NOT EXISTS idx_professors_department ON professors(department);
CREATE INDEX IF NOT EXISTS idx_alumni_industry ON alumni_network(industry);
CREATE INDEX IF NOT EXISTS idx_alumni_mentorship ON alumni_network(mentorship_available);

-- Views (CREATE VIEW IF NOT EXISTS)
CREATE VIEW IF NOT EXISTS course_stats AS
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
    GROUP_CONCAT(DISTINCT p.name, ', ') as instructors,
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

CREATE VIEW IF NOT EXISTS course_details AS
SELECT 
    c.*,
    GROUP_CONCAT(DISTINCT p.name, ', ') as instructors,
    COUNT(DISTINCT cp.professor_id) as instructor_count
FROM courses c
LEFT JOIN course_professors cp ON c.id = cp.course_id
LEFT JOIN professors p ON cp.professor_id = p.id
GROUP BY c.id;

CREATE VIEW IF NOT EXISTS user_enrollments AS
SELECT 
    u.id as user_id,
    u.email,
    u.name,
    u.user_type,
    u.graduation_year,
    u.major,
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

CREATE VIEW IF NOT EXISTS alumni_directory AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.graduation_year,
    u.major,
    a.current_employer,
    a.job_title,
    a.industry,
    a.location,
    a.mentorship_available
FROM users u
LEFT JOIN alumni_network a ON u.id = a.user_id
WHERE u.user_type = 'alumni'
ORDER BY u.graduation_year DESC, u.name;

CREATE VIEW IF NOT EXISTS user_stats AS
SELECT 
    user_type,
    COUNT(*) as user_count,
    COUNT(DISTINCT major) as majors_count,
    MIN(graduation_year) as earliest_graduation,
    MAX(graduation_year) as latest_graduation,
    AVG(graduation_year) as avg_graduation_year
FROM users
WHERE user_type IS NOT NULL
GROUP BY user_type;

CREATE VIEW IF NOT EXISTS alumni_stats AS
SELECT 
    COUNT(*) as total_alumni,
    COUNT(DISTINCT major) as distinct_majors,
    COUNT(DISTINCT graduation_year) as graduation_years,
    SUM(CASE WHEN mentorship_available = 1 THEN 1 ELSE 0 END) as mentors_available,
    AVG(graduation_year) as avg_graduation_year,
    GROUP_CONCAT(DISTINCT industry) as industries
FROM users u
LEFT JOIN alumni_network a ON u.id = a.user_id
WHERE u.user_type = 'alumni';
`;

// DON'T delete the old database - keep existing data
console.log('Initializing database schema (preserving existing data)...');

// Create new database connection (will open existing file if it exists)
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
        return;
    }
    console.log(' Connected to database successfully');
    
    // Execute schema
    db.exec(schema, (err) => {
        if (err) {
            console.error(' Error creating schema:', err);
        } else {
            console.log(' Database schema verified/created successfully!');
        }
        
        db.close();
    });
});
