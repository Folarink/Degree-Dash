// CourseModel.js
// This file defines the Course model for interacting with the courses table in the database
// It provides methods for CRUD operations and querying course data

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Define the path to the SQLite database file
const dbPath = path.join(__dirname, 'DegreeDashDatabase.db');
console.log('Using database at:', dbPath);

// Create a new database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to SQLite database successfully!');
    }
});

// Enable foreign key constraints
db.run('PRAGMA foreign_keys = ON', (err) => {
    if (err) {
        console.error('Error enabling foreign keys:', err);
    }
});

// Create a Promise-based wrapper around SQLite methods
const dbAsync = {
    // Get a single row from the database
    // Example: const user = await dbAsync.get('SELECT * FROM users WHERE id = ?', [1])
    get: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.get(sql, params, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
    },
    
    // Run a query that modifies data (INSERT, UPDATE, DELETE)
    // Returns information about the operation (last inserted ID, number of changes)
    run: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, changes: this.changes });
            });
        });
    },
    
    // Get multiple rows from the database
    // Example: const users = await dbAsync.all('SELECT * FROM users')
    all: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },
    
    // Close the database connection
    close: () => {
        return new Promise((resolve, reject) => {
            db.close((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
};

// Course Class
// This class provides static methods for interacting with course data in the database
class Course {
    
    /**
     * Find all courses, optionally filtered by criteria
     * @param {Object} filters - Filter criteria (department, search, etc.)
     * @returns {Promise<Array>} - Array of course objects
     */
    static async findAll(filters = {}) {
        try {
            // Start with base query
            let sql = 'SELECT * FROM courses WHERE 1=1';
            const params = [];

            // Add department filter if provided and not 'all'
            if (filters.department && filters.department !== 'all') {
                sql += ' AND department = ?';
                params.push(filters.department);
            }

            // Add search filter if provided (searches in course_code and course_name)
            if (filters.search && filters.search.trim() !== '') {
                sql += ' AND (course_code LIKE ? OR course_name LIKE ? OR description LIKE ?)';
                const searchTerm = `%${filters.search.trim()}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }

            // Order results by course code
            sql += ' ORDER BY course_code';
            
            // Execute query and return results
            const courses = await dbAsync.all(sql, params);
            return courses;
        } catch (error) {
            console.error('Error finding courses:', error);
            throw error;
        }
    }

    /**
     * Find a course by its unique course code
     * @param {string} courseCode - Course code (e.g., 'COMP 3030')
     * @returns {Promise<Object|undefined>} - Course object or undefined if not found
     */
    static async findByCode(courseCode) {
        try {
            const sql = 'SELECT * FROM courses WHERE course_code = ?';
            const course = await dbAsync.get(sql, [courseCode]);
            return course;
        } catch (error) {
            console.error('Error finding course by code:', error);
            throw error;
        }
    }

    /**
     * Find a course by its database ID
     * @param {number} id - Course ID from database
     * @returns {Promise<Object|undefined>} - Course object or undefined if not found
     */
    static async findById(id) {
        try {
            const sql = 'SELECT * FROM courses WHERE id = ?';
            const course = await dbAsync.get(sql, [id]);
            return course;
        } catch (error) {
            console.error('Error finding course by ID:', error);
            throw error;
        }
    }

    /**
     * Create a new course in the database
     * @param {Object} courseData - Course data object
     * @returns {Promise<Object>} - The newly created course object
     */
    static async create(courseData) {
        try {
            // Destructure course data - using the column names from your schema
            const {
                course_code,        // Course code (required) - maps to course_code column
                course_name,        // Course title (required) - maps to course_name column
                department,         // Department (required)
                description,        // Course description (optional)
            } = courseData;

            // Validate required fields
            if (!course_code || !course_name || !department) {
                throw new Error('Missing required fields: course_code, course_name, and department are required');
            }

            // SQL INSERT statement matching your schema
            const sql = `
                INSERT INTO courses (
                    course_code, 
                    course_name, 
                    department, 
                    description
                ) VALUES (?, ?, ?, ?)
            `;

            // Parameters array in the same order as the SQL statement
            const params = [
                course_code,
                course_name,
                department,
                description || null  // Use null if description not provided
            ];

            // Execute the insert
            const result = await dbAsync.run(sql, params);
            
            // Return the newly created course by fetching it with the generated ID
            return await this.findById(result.id);
        } catch (error) {
            console.error('Error creating course:', error);
            throw error;
        }
    }

    /**
     * Update an existing course
     * @param {number} id - Course ID
     * @param {Object} courseData - Updated course data
     * @returns {Promise<Object>} - The updated course object
     */
    static async update(id, courseData) {
        try {
            const {
                course_code,
                course_name,
                department,
                description
            } = courseData;

            // SQL UPDATE statement
            const sql = `
                UPDATE courses 
                SET course_code = ?,
                    course_name = ?,
                    department = ?,
                    description = ?
                WHERE id = ?
            `;

            const params = [
                course_code,
                course_name,
                department,
                description,
                id
            ];

            await dbAsync.run(sql, params);
            
            // Return the updated course
            return await this.findById(id);
        } catch (error) {
            console.error('Error updating course:', error);
            throw error;
        }
    }

    /**
     * Delete a course from the database
     * @param {number} id - Course ID
     * @returns {Promise<boolean>} - True if deleted, false if not found
     */
    static async delete(id) {
        try {
            // First check if this course has any reviews
            const reviewCheck = await dbAsync.get(
                'SELECT COUNT(*) as count FROM reviews WHERE course_id = ?',
                [id]
            );
            
            if (reviewCheck.count > 0) {
                throw new Error('Cannot delete course with existing reviews');
            }

            const sql = 'DELETE FROM courses WHERE id = ?';
            const result = await dbAsync.run(sql, [id]);
            return result.changes > 0;
        } catch (error) {
            console.error('Error deleting course:', error);
            throw error;
        }
    }

    /**
     * Get all unique departments from the courses table
     * @returns {Promise<Array>} - Array of department names
     */
    static async getDepartments() {
        try {
            const sql = 'SELECT DISTINCT department FROM courses WHERE department IS NOT NULL ORDER BY department';
            const rows = await dbAsync.all(sql);
            return rows.map(row => row.department);
        } catch (error) {
            console.error('Error getting departments:', error);
            throw error;
        }
    }

    /**
     * Get course statistics
     * @returns {Promise<Object>} - Statistics object
     */
    static async getStats() {
        try {
            const stats = await dbAsync.get(`
                SELECT 
                    COUNT(*) as total_courses,
                    COUNT(DISTINCT department) as total_departments
                FROM courses
            `);
            
            // Get count of courses with reviews
            const coursesWithReviews = await dbAsync.get(`
                SELECT COUNT(DISTINCT course_id) as count
                FROM reviews
            `);
            
            return {
                total_courses: stats.total_courses,
                total_departments: stats.total_departments,
                courses_with_reviews: coursesWithReviews.count
            };
        } catch (error) {
            console.error('Error getting stats:', error);
            throw error;
        }
    }

    /**
     * Get courses by department
     * @param {string} department - Department name
     * @returns {Promise<Array>} - Array of course objects
     */
    static async findByDepartment(department) {
        try {
            const sql = 'SELECT * FROM courses WHERE department = ? ORDER BY course_code';
            const courses = await dbAsync.all(sql, [department]);
            return courses;
        } catch (error) {
            console.error('Error finding courses by department:', error);
            throw error;
        }
    }

    /**
     * Search courses by keyword
     * @param {string} keyword - Search term
     * @returns {Promise<Array>} - Array of matching course objects
     */
    static async search(keyword) {
        try {
            const searchTerm = `%${keyword}%`;
            const sql = `
                SELECT * FROM courses 
                WHERE course_code LIKE ? 
                   OR course_name LIKE ? 
                   OR description LIKE ?
                ORDER BY course_code
            `;
            const courses = await dbAsync.all(sql, [searchTerm, searchTerm, searchTerm]);
            return courses;
        } catch (error) {
            console.error('Error searching courses:', error);
            throw error;
        }
    }

    /**
     * Get a course with its reviews and professor information
     * @param {number} courseId - Course ID
     * @returns {Promise<Object>} - Course object with reviews array
     */
    static async getCourseWithReviews(courseId) {
        try {
            // Get the course
            const course = await this.findById(courseId);
            if (!course) {
                return null;
            }

            // Get all reviews for this course with professor info
            const reviews = await dbAsync.all(`
                SELECT r.*, p.name as professor_name
                FROM reviews r
                LEFT JOIN professors p ON r.professor_id = p.id
                WHERE r.course_id = ?
                ORDER BY r.created_at DESC
            `, [courseId]);

            // Calculate average rating
            let avgRating = null;
            if (reviews.length > 0) {
                const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
                avgRating = sum / reviews.length;
            }

            return {
                ...course,
                reviews: reviews,
                review_count: reviews.length,
                average_rating: avgRating ? parseFloat(avgRating.toFixed(1)) : null
            };
        } catch (error) {
            console.error('Error getting course with reviews:', error);
            throw error;
        }
    }
}

/**
 * Test function to verify the Course model is working correctly
 */
async function testCourseModel() {
    console.log('\nTesting Course Model...');
    console.log('=================================');

    try {
        // Check if courses table exists
        const tableCheck = await dbAsync.get(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='courses'"
        );

        if (!tableCheck) {
            console.log('Courses table not found!');
            return;
        }
        
        console.log('Courses table found');
        
        // Get database statistics
        const stats = await Course.getStats();
        console.log('\nDatabase Statistics:');
        console.log('   Total Courses: ' + stats.total_courses);
        console.log('   Total Departments: ' + stats.total_departments);
        console.log('   Courses with Reviews: ' + stats.courses_with_reviews);

        // Get all departments
        const departments = await Course.getDepartments();
        if (departments.length > 0) {
            console.log('\nDepartments:');
            departments.forEach(dept => {
                console.log('   - ' + dept);
            });
        }

        // Get all courses
        const courses = await Course.findAll();
        console.log('\nAll Courses (' + courses.length + ' total):');
        console.log('----------------------------------------');
        
        courses.forEach((course, index) => {
            console.log((index + 1) + '. ' + course.course_code + ': ' + course.course_name);
            console.log('   Department: ' + course.department);
            console.log('   Description: ' + (course.description ? course.description.substring(0, 100) + '...' : 'No description'));
            console.log('   Created: ' + course.created_at);
            console.log('');
        });

        // Test search functionality
        console.log('\nSearch Test (searching for "algorithm"):');
        console.log('----------------------------------------');
        const searchResults = await Course.search('algorithm');
        searchResults.forEach(course => {
            console.log('   - ' + course.course_code + ': ' + course.course_name);
        });

        // Test getCourseWithReviews for COMP 3030
        const comp3030 = await Course.findByCode('COMP 3030');
        if (comp3030) {
            console.log('\nCOMP 3030 Details:');
            console.log('----------------------------------------');
            const courseWithReviews = await Course.getCourseWithReviews(comp3030.id);
            console.log('Course: ' + courseWithReviews.course_code + ' - ' + courseWithReviews.course_name);
            console.log('Department: ' + courseWithReviews.department);
            console.log('Description: ' + courseWithReviews.description);
            console.log('Total Reviews: ' + courseWithReviews.review_count);
            console.log('Average Rating: ' + (courseWithReviews.average_rating || 'No ratings yet'));
            
            if (courseWithReviews.reviews.length > 0) {
                console.log('\nRecent Reviews:');
                courseWithReviews.reviews.slice(0, 3).forEach((review, i) => {
                    console.log('   Review ' + (i+1) + ': Rating ' + review.rating + '/5 - ' + 
                              (review.comment ? review.comment.substring(0, 100) + '...' : 'No comment'));
                });
            }
        }

    } catch (error) {
        console.error('Error during testing:', error);
    } finally {
        await dbAsync.close();
        console.log('\nDatabase connection closed');
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    testCourseModel();
}

// Export the Course class
module.exports = Course;