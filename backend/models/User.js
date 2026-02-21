// backend/models/User.js
// This model handles all user-related database operations
// It provides methods for creating users, finding users, managing enrollments, and more

const { runAsync, getAsync, allAsync } = require('../config/database');

class User {
    /**
     * Finds an existing user by their Microsoft ID or creates a new user if they don't exist.
     * This is typically called during the OAuth login process with Microsoft.
     * If the user already exists in our system, we simply update their last login time.
     * If it's a new user, we create a new record with their Microsoft profile information.
     * 
     * @param {Object} profile - The Microsoft user profile object containing user information
     * @returns {Object} The user object (either existing or newly created)
     */
    static async findOrCreateFromMicrosoft(profile) {
        try {
            // First, check if this user already exists in our database by their Microsoft ID
            let user = await this.findByMicrosoftId(profile.id);
            
            // If user doesn't exist, we need to create a new user record
            if (!user) {
                // Create new user with information from their Microsoft profile
                // We capture their Microsoft ID, email, display name, and profile photo URL
                user = await this.create({
                    microsoft_id: profile.id,
                    email: profile.emails[0].value,
                    name: profile.displayName,
                    avatar_url: profile.photos?.[0]?.value
                });
            } else {
                // User exists, so we just update their last login timestamp
                // This helps us track when they last accessed the system
                await this.updateLastLogin(user.id);
            }
            
            return user;
        } catch (error) {
            console.error('Error finding/creating user:', error);
            throw error;
        }
    }

    /**
     * Creates a new user record in the database.
     * This method inserts a new user with their Microsoft ID, email, name, and avatar URL.
     * After insertion, it retrieves the complete user record to return.
     * 
     * @param {Object} userData - Object containing user data (microsoft_id, email, name, avatar_url)
     * @returns {Object} The newly created user record
     */
    static async create(userData) {
        try {
            // Extract user data from the input object
            const { microsoft_id, email, name, avatar_url } = userData;
            
            // SQL query to insert a new user into the users table
            // We set the last_login to the current timestamp
            const sql = `
                INSERT INTO users (microsoft_id, email, name, avatar_url, last_login)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            `;
            
            // Execute the insert query and get the resulting user
            const result = await runAsync(sql, [microsoft_id, email, name, avatar_url]);
            return await this.findById(result.id);
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    /**
     * Finds a user by their unique Microsoft ID.
     * This is useful for authentication and linking Microsoft accounts.
     * 
     * @param {string} microsoftId - The Microsoft user ID
     * @returns {Object|null} The user object if found, null otherwise
     */
    static async findByMicrosoftId(microsoftId) {
        try {
            const sql = 'SELECT * FROM users WHERE microsoft_id = ?';
            return await getAsync(sql, [microsoftId]);
        } catch (error) {
            console.error('Error finding user by Microsoft ID:', error);
            throw error;
        }
    }

    /**
     * Finds a user by their email address.
     * This is useful for looking up users by their email.
     * 
     * @param {string} email - The user's email address
     * @returns {Object|null} The user object if found, null otherwise
     */
    static async findByEmail(email) {
        try {
            const sql = 'SELECT * FROM users WHERE email = ?';
            return await getAsync(sql, [email]);
        } catch (error) {
            console.error('Error finding user by email:', error);
            throw error;
        }
    }

    /**
     * Finds a user by their internal database ID.
     * This is the primary method for retrieving a user by their unique identifier.
     * 
     * @param {number} id - The user's internal database ID
     * @returns {Object|null} The user object if found, null otherwise
     */
    static async findById(id) {
        try {
            const sql = 'SELECT * FROM users WHERE id = ?';
            return await getAsync(sql, [id]);
        } catch (error) {
            console.error('Error finding user by ID:', error);
            throw error;
        }
    }

    /**
     * Updates the last login timestamp for a user.
     * This helps track user activity and when they last accessed the system.
     * 
     * @param {number} id - The user's internal database ID
     */
    static async updateLastLogin(id) {
        try {
            const sql = 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?';
            await runAsync(sql, [id]);
        } catch (error) {
            console.error('Error updating last login:', error);
            throw error;
        }
    }

    /**
     * Retrieves all courses that a user is enrolled in.
     * The results include course details along with enrollment information
     * such as when they enrolled and their current status.
     * Results are sorted by enrollment date (most recent first).
     * 
     * @param {number} userId - The user's internal database ID
     * @returns {Array} Array of enrolled course objects with enrollment details
     */
    static async getEnrolledCourses(userId) {
        try {
            const sql = `
                SELECT c.*, e.enrolled_at, e.status, e.grade
                FROM courses c
                JOIN enrollments e ON c.id = e.course_id
                WHERE e.user_id = ?
                ORDER BY e.enrolled_at DESC
            `;
            return await allAsync(sql, [userId]);
        } catch (error) {
            console.error('Error getting enrolled courses:', error);
            throw error;
        }
    }

    /**
     * Checks whether a user is currently enrolled in a specific course.
     * 
     * @param {number} userId - The user's internal database ID
     * @param {number} courseId - The course's internal database ID
     * @returns {boolean} True if enrolled, false otherwise
     */
    static async isEnrolled(userId, courseId) {
        try {
            const sql = 'SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?';
            const enrollment = await getAsync(sql, [userId, courseId]);
            return !!enrollment;
        } catch (error) {
            console.error('Error checking enrollment:', error);
            throw error;
        }
    }

    /**
     * Enrolls a user in a course if they are not already enrolled and there is capacity.
     * This method uses a database transaction to ensure data integrity:
     * - It first checks if the user is already enrolled
     * - Then checks if the course has available capacity
     * - Creates the enrollment record
     * - Increments the enrolled count for the course
     * 
     * @param {number} userId - The user's internal database ID
     * @param {number} courseId - The course's internal database ID
     * @returns {Object} Result object with success status and message
     */
    static async enrollInCourse(userId, courseId) {
        try {
            // First, check if the user is already enrolled in this course
            const enrolled = await this.isEnrolled(userId, courseId);
            if (enrolled) {
                return { success: false, message: 'Already enrolled' };
            }

            // Check if the course has available capacity
            // We need to ensure there's room before allowing enrollment
            const course = await getAsync(
                'SELECT capacity, enrolled FROM courses WHERE id = ?',
                [courseId]
            );
            
            // If the course is full, we cannot allow new enrollments
            if (course.enrolled >= course.capacity) {
                return { success: false, message: 'Course is full' };
            }

            // Begin a database transaction to ensure both operations succeed together
            // This prevents data inconsistency if one operation fails
            await runAsync('BEGIN TRANSACTION');
            
            // Insert the enrollment record
            await runAsync(
                'INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)',
                [userId, courseId]
            );
            
            // Increment the enrolled count for the course
            await runAsync(
                'UPDATE courses SET enrolled = enrolled + 1 WHERE id = ?',
                [courseId]
            );
            
            // Commit the transaction to save all changes
            await runAsync('COMMIT');
            
            return { success: true, message: 'Enrolled successfully' };
        } catch (error) {
            // Rollback the transaction if any error occurs
            await runAsync('ROLLBACK');
            console.error('Error enrolling in course:', error);
            throw error;
        }
    }

    /**
     * Drops a user from a course if they are currently enrolled.
     * This method uses a database transaction to ensure data integrity:
     * - It first verifies the user is enrolled
     * - Removes the enrollment record
     * - Decrements the enrolled count for the course
     * 
     * @param {number} userId - The user's internal database ID
     * @param {number} courseId - The course's internal database ID
     * @returns {Object} Result object with success status and message
     */
    static async dropCourse(userId, courseId) {
        try {
            // First, verify that the user is actually enrolled in this course
            const enrolled = await this.isEnrolled(userId, courseId);
            if (!enrolled) {
                return { success: false, message: 'Not enrolled' };
            }

            // Begin a database transaction to ensure both operations succeed together
            await runAsync('BEGIN TRANSACTION');
            
            // Remove the enrollment record from the enrollments table
            await runAsync(
                'DELETE FROM enrollments WHERE user_id = ? AND course_id = ?',
                [userId, courseId]
            );
            
            // Decrement the enrolled count for the course
            // We use a condition to ensure the count doesn't go below zero
            await runAsync(
                'UPDATE courses SET enrolled = enrolled - 1 WHERE id = ? AND enrolled > 0',
                [courseId]
            );
            
            // Commit the transaction to save all changes
            await runAsync('COMMIT');
            
            return { success: true, message: 'Dropped successfully' };
        } catch (error) {
            // Rollback the transaction if any error occurs
            await runAsync('ROLLBACK');
            console.error('Error dropping course:', error);
            throw error;
        }
    }

    /**
     * Retrieves all users from the database.
     * This is typically used by administrators to view all registered users.
     * The results exclude sensitive information like Microsoft IDs and passwords.
     * Results are sorted by creation date (newest first).
     * 
     * @returns {Array} Array of user objects with basic information
     */
    static async getAllUsers() {
        try {
            // Select only non-sensitive user information
            const sql = 'SELECT id, email, name, avatar_url, created_at, last_login FROM users ORDER BY created_at DESC';
            return await allAsync(sql);
        } catch (error) {
            console.error('Error getting all users:', error);
            throw error;
        }
    }
}

module.exports = User;
