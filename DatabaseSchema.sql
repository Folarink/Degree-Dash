-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- Users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Courses table
CREATE TABLE courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_code TEXT UNIQUE NOT NULL,
    course_name TEXT NOT NULL,
    department TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Professors table
CREATE TABLE professors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    department TEXT,
    UNIQUE(name, department)
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

-- Indexes
CREATE INDEX idx_reviews_course ON reviews(course_id);
CREATE INDEX idx_reviews_professor ON reviews(professor_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_courses_code ON courses(course_code);
CREATE INDEX idx_professors_name ON professors(name);

-- View for course statistics
CREATE VIEW course_stats AS
SELECT 
    c.id,
    c.course_code,
    c.course_name,
    COUNT(r.id) as review_count,
    AVG(r.rating) as avg_rating,
    AVG(r.difficulty) as avg_difficulty,
    SUM(CASE WHEN r.would_recommend THEN 1 ELSE 0 END) * 1.0 / COUNT(r.id) as recommend_rate
FROM courses c
LEFT JOIN reviews r ON c.id = r.course_id
GROUP BY c.id;