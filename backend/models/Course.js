// backend/models/Course.js
const { runAsync, getAsync, allAsync } = require('../config/database');

class Course {
    
    /**
     * Find all courses with optional filters
     * Returns courses with professor information from course_details view
     */
    static async findAll(filters = {}) {
        try {
            let sql = 'SELECT * FROM course_details WHERE 1=1';
            const params = [];

            // Add department filter
            if (filters.department && filters.department !== 'all') {
                sql += ' AND department = ?';
                params.push(filters.department);
            }

            // Add search filter (searches in code, name, description)
            if (filters.search && filters.search.trim() !== '') {
                sql += ' AND (course_code LIKE ? OR course_name LIKE ? OR description LIKE ?)';
                const searchTerm = `%${filters.search.trim()}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }

            // Add semester filter
            if (filters.semester && filters.semester !== 'all') {
                sql += ' AND semester = ?';
                params.push(filters.semester);
            }

            // Add year filter
            if (filters.year) {
                sql += ' AND year = ?';
                params.push(filters.year);
            }

            sql += ' ORDER BY course_code';
            
            const courses = await allAsync(sql, params);
            return courses;
        } catch (error) {
            console.error('Error finding courses:', error);
            throw error;
        }
    }

    /**
     * Find course by its unique course code
     * Returns course with all professors as a comma-separated list
     */
    static async findByCode(courseCode) {
        try {
            const sql = 'SELECT * FROM course_details WHERE course_code = ?';
            const course = await getAsync(sql, [courseCode]);
            return course;
        } catch (error) {
            console.error('Error finding course by code:', error);
            throw error;
        }
    }

    /**
     * Find course by database ID
     * Returns course with all professors as a comma-separated list
     */
    static async findById(id) {
        try {
            const sql = 'SELECT * FROM course_details WHERE id = ?';
            const course = await getAsync(sql, [id]);
            return course;
        } catch (error) {
            console.error('Error finding course by ID:', error);
            throw error;
        }
    }

    /**
     * Create a new course
     * @param {Object} courseData - Course data
     * @param {Array} professorIds - Array of professor IDs to link to this course
     */
    static async create(courseData, professorIds = []) {
        try {
            const {
                course_code,
                course_name,
                department,
                credits,
                description,
                prerequisites,
                schedule,
                semester,
                year,
                capacity = 30,
                enrolled = 0
            } = courseData;

            // Validate required fields
            if (!course_code || !course_name || !department || !credits) {
                throw new Error('Missing required fields: course_code, course_name, department, credits');
            }

            // Start transaction
            await runAsync('BEGIN TRANSACTION');

            try {
                // Insert course
                const sql = `
                    INSERT INTO courses (
                        course_code, course_name, department, credits,
                        description, prerequisites, schedule, semester, year,
                        capacity, enrolled
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

                const params = [
                    course_code, course_name, department, credits,
                    description, prerequisites, schedule, semester, year,
                    capacity, enrolled
                ];

                const result = await runAsync(sql, params);
                const courseId = result.id;

                // Link professors if provided
                if (professorIds.length > 0) {
                    for (const professorId of professorIds) {
                        await runAsync(
                            'INSERT INTO course_professors (course_id, professor_id, role) VALUES (?, ?, ?)',
                            [courseId, professorId, 'Instructor']
                        );
                    }
                }

                await runAsync('COMMIT');
                return await this.findById(courseId);
            } catch (error) {
                await runAsync('ROLLBACK');
                throw error;
            }
        } catch (error) {
            console.error('Error creating course:', error);
            throw error;
        }
    }

    /**
     * Update an existing course
     */
    static async update(id, courseData, professorIds = null) {
        try {
            const {
                course_code,
                course_name,
                department,
                credits,
                description,
                prerequisites,
                schedule,
                semester,
                year,
                capacity
            } = courseData;

            // Start transaction
            await runAsync('BEGIN TRANSACTION');

            try {
                // Update course
                const sql = `
                    UPDATE courses 
                    SET course_code = ?,
                        course_name = ?,
                        department = ?,
                        credits = ?,
                        description = ?,
                        prerequisites = ?,
                        schedule = ?,
                        semester = ?,
                        year = ?,
                        capacity = ?
                    WHERE id = ?
                `;

                const params = [
                    course_code, course_name, department, credits,
                    description, prerequisites, schedule, semester, year,
                    capacity, id
                ];

                await runAsync(sql, params);

                // Update professor links if provided
                if (professorIds !== null) {
                    // Remove old links
                    await runAsync('DELETE FROM course_professors WHERE course_id = ?', [id]);
                    
                    // Add new links
                    for (const professorId of professorIds) {
                        await runAsync(
                            'INSERT INTO course_professors (course_id, professor_id, role) VALUES (?, ?, ?)',
                            [id, professorId, 'Instructor']
                        );
                    }
                }

                await runAsync('COMMIT');
                return await this.findById(id);
            } catch (error) {
                await runAsync('ROLLBACK');
                throw error;
            }
        } catch (error) {
            console.error('Error updating course:', error);
            throw error;
        }
    }

    /**
     * Delete a course
     */
    static async delete(id) {
        try {
            // Check if course has enrollments
            const enrollmentCheck = await getAsync(
                'SELECT COUNT(*) as count FROM enrollments WHERE course_id = ?',
                [id]
            );
            
            if (enrollmentCheck.count > 0) {
                throw new Error('Cannot delete course with active enrollments');
            }

            // Course_professors and reviews will be deleted automatically due to CASCADE
            const sql = 'DELETE FROM courses WHERE id = ?';
            const result = await runAsync(sql, [id]);
            return result.changes > 0;
        } catch (error) {
            console.error('Error deleting course:', error);
            throw error;
        }
    }

    /**
     * Increment enrolled count (when a student enrolls)
     */
    static async incrementEnrolled(id) {
        try {
            const sql = 'UPDATE courses SET enrolled = enrolled + 1 WHERE id = ? AND enrolled < capacity';
            const result = await runAsync(sql, [id]);
            
            if (result.changes === 0) {
                throw new Error('Course is full or does not exist');
            }
            
            return await this.findById(id);
        } catch (error) {
            console.error('Error incrementing enrollment:', error);
            throw error;
        }
    }

    /**
     * Decrement enrolled count (when a student drops)
     */
    static async decrementEnrolled(id) {
        try {
            const sql = 'UPDATE courses SET enrolled = enrolled - 1 WHERE id = ? AND enrolled > 0';
            const result = await runAsync(sql, [id]);
            
            if (result.changes === 0) {
                throw new Error('No students enrolled or course does not exist');
            }
            
            return await this.findById(id);
        } catch (error) {
            console.error('Error decrementing enrollment:', error);
            throw error;
        }
    }

    /**
     * Get all unique departments
     */
    static async getDepartments() {
        try {
            const sql = 'SELECT DISTINCT department FROM courses WHERE department IS NOT NULL ORDER BY department';
            const rows = await allAsync(sql);
            return rows.map(row => row.department);
        } catch (error) {
            console.error('Error getting departments:', error);
            throw error;
        }
    }

    /**
     * Get all unique semesters
     */
    static async getSemesters() {
        try {
            const sql = 'SELECT DISTINCT semester FROM courses WHERE semester IS NOT NULL ORDER BY semester';
            const rows = await allAsync(sql);
            return rows.map(row => row.semester);
        } catch (error) {
            console.error('Error getting semesters:', error);
            throw error;
        }
    }

    /**
     * Get all unique years
     */
    static async getYears() {
        try {
            const sql = 'SELECT DISTINCT year FROM courses WHERE year IS NOT NULL ORDER BY year DESC';
            const rows = await allAsync(sql);
            return rows.map(row => row.year);
        } catch (error) {
            console.error('Error getting years:', error);
            throw error;
        }
    }

    /**
     * Get course statistics
     */
    static async getStats() {
        try {
            const stats = await getAsync(`
                SELECT 
                    COUNT(*) as total_courses,
                    COUNT(DISTINCT department) as total_departments,
                    SUM(capacity) as total_capacity,
                    SUM(enrolled) as total_enrolled,
                    AVG(CAST(enrolled AS FLOAT) / capacity) * 100 as avg_fill_percentage
                FROM courses
            `);
            
            const professorStats = await getAsync(`
                SELECT 
                    COUNT(DISTINCT course_id) as courses_with_multiple_professors,
                    AVG(prof_count) as avg_professors_per_course
                FROM (
                    SELECT course_id, COUNT(*) as prof_count
                    FROM course_professors
                    GROUP BY course_id
                )
            `);
            
            const reviewStats = await getAsync(`
                SELECT 
                    COUNT(DISTINCT course_id) as courses_with_reviews,
                    COUNT(*) as total_reviews
                FROM reviews
            `);
            
            return {
                total_courses: stats.total_courses || 0,
                total_departments: stats.total_departments || 0,
                total_capacity: stats.total_capacity || 0,
                total_enrolled: stats.total_enrolled || 0,
                avg_fill_percentage: stats.avg_fill_percentage || 0,
                courses_with_multiple_professors: professorStats.courses_with_multiple_professors || 0,
                avg_professors_per_course: professorStats.avg_professors_per_course || 1,
                courses_with_reviews: reviewStats.courses_with_reviews || 0,
                total_reviews: reviewStats.total_reviews || 0
            };
        } catch (error) {
            console.error('Error getting stats:', error);
            throw error;
        }
    }

    /**
     * Get courses by department
     */
    static async findByDepartment(department) {
        try {
            const sql = 'SELECT * FROM course_details WHERE department = ? ORDER BY course_code';
            const courses = await allAsync(sql, [department]);
            return courses;
        } catch (error) {
            console.error('Error finding courses by department:', error);
            throw error;
        }
    }

    /**
     * Search courses by keyword
     */
    static async search(keyword) {
        try {
            const searchTerm = `%${keyword}%`;
            const sql = `
                SELECT * FROM course_details 
                WHERE course_code LIKE ? 
                   OR course_name LIKE ? 
                   OR description LIKE ?
                ORDER BY course_code
            `;
            const courses = await allAsync(sql, [searchTerm, searchTerm, searchTerm]);
            return courses;
        } catch (error) {
            console.error('Error searching courses:', error);
            throw error;
        }
    }

    /**
     * Check if course has available seats
     */
    static async hasAvailableSeats(id) {
        try {
            const course = await this.findById(id);
            return course && course.enrolled < course.capacity;
        } catch (error) {
            console.error('Error checking available seats:', error);
            throw error;
        }
    }

    /**
     * Get all professors for a specific course
     */
    static async getCourseProfessors(courseId) {
        try {
            const sql = `
                SELECT p.*, cp.role
                FROM professors p
                JOIN course_professors cp ON p.id = cp.professor_id
                WHERE cp.course_id = ?
                ORDER BY 
                    CASE cp.role
                        WHEN 'Primary Instructor' THEN 1
                        WHEN 'Instructor' THEN 2
                        WHEN 'Teaching Assistant' THEN 3
                        ELSE 4
                    END
            `;
            return await allAsync(sql, [courseId]);
        } catch (error) {
            console.error('Error getting course professors:', error);
            throw error;
        }
    }

    /**
     * Add a professor to a course
     */
    static async addProfessorToCourse(courseId, professorId, role = 'Instructor') {
        try {
            await runAsync(
                'INSERT OR IGNORE INTO course_professors (course_id, professor_id, role) VALUES (?, ?, ?)',
                [courseId, professorId, role]
            );
            return await this.getCourseProfessors(courseId);
        } catch (error) {
            console.error('Error adding professor to course:', error);
            throw error;
        }
    }

    /**
     * Remove a professor from a course
     */
    static async removeProfessorFromCourse(courseId, professorId) {
        try {
            await runAsync(
                'DELETE FROM course_professors WHERE course_id = ? AND professor_id = ?',
                [courseId, professorId]
            );
            return await this.getCourseProfessors(courseId);
        } catch (error) {
            console.error('Error removing professor from course:', error);
            throw error;
        }
    }

    /**
     * Update professor's role in a course
     */
    static async updateProfessorRole(courseId, professorId, role) {
        try {
            await runAsync(
                'UPDATE course_professors SET role = ? WHERE course_id = ? AND professor_id = ?',
                [role, courseId, professorId]
            );
            return await this.getCourseProfessors(courseId);
        } catch (error) {
            console.error('Error updating professor role:', error);
            throw error;
        }
    }

    /**
     * Get complete course details with professors and reviews
     */
    static async getCourseWithAllDetails(courseId) {
        try {
            const course = await this.findById(courseId);
            if (!course) return null;

            const professors = await this.getCourseProfessors(courseId);
            
            const reviews = await allAsync(`
                SELECT r.*, p.name as professor_name
                FROM reviews r
                LEFT JOIN professors p ON r.professor_id = p.id
                WHERE r.course_id = ?
                ORDER BY r.created_at DESC
            `, [courseId]);

            // Calculate average ratings
            let avgRating = null;
            let avgDifficulty = null;
            if (reviews.length > 0) {
                const ratingSum = reviews.reduce((acc, r) => acc + r.rating, 0);
                const difficultySum = reviews.reduce((acc, r) => acc + r.difficulty, 0);
                avgRating = ratingSum / reviews.length;
                avgDifficulty = difficultySum / reviews.length;
            }

            return {
                ...course,
                professors: professors,
                professor_count: professors.length,
                reviews: reviews,
                review_count: reviews.length,
                average_rating: avgRating ? parseFloat(avgRating.toFixed(1)) : null,
                average_difficulty: avgDifficulty ? parseFloat(avgDifficulty.toFixed(1)) : null
            };
        } catch (error) {
            console.error('Error getting course with all details:', error);
            throw error;
        }
    }

    /**
     * Get all courses taught by a specific professor
     */
    static async getCoursesByProfessor(professorId) {
        try {
            const sql = `
                SELECT c.*, cp.role
                FROM courses c
                JOIN course_professors cp ON c.id = cp.course_id
                WHERE cp.professor_id = ?
                ORDER BY c.year DESC, c.semester
            `;
            return await allAsync(sql, [professorId]);
        } catch (error) {
            console.error('Error getting courses by professor:', error);
            throw error;
        }
    }
}

module.exports = Course;
