// backend/models/User.js
const { runAsync, getAsync, allAsync } = require('../config/database');

class User {
    /**
     * Find or create user from Microsoft profile
     */
    static async findOrCreateFromMicrosoft(profile, userType = 'current') {
        try {
            let user = await this.findByMicrosoftId(profile.id);
            
            if (!user) {
                user = await this.create({
                    microsoft_id: profile.id,
                    email: profile.emails[0].value,
                    name: profile.displayName,
                    avatar_url: profile.photos?.[0]?.value,
                    user_type: userType
                });
            } else {
                await this.updateLastLogin(user.id);
            }
            
            return user;
        } catch (error) {
            console.error('Error finding/creating user:', error);
            throw error;
        }
    }

    /**
     * Create a new user
     */
    static async create(userData) {
        try {
            const { 
                microsoft_id, 
                email, 
                name, 
                avatar_url, 
                user_type = 'current',
                graduation_year = null,
                major = null,
                enrollment_year = null
            } = userData;
            
            const sql = `
                INSERT INTO users (
                    microsoft_id, email, name, avatar_url, 
                    user_type, graduation_year, major, enrollment_year, last_login
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `;
            
            const result = await runAsync(sql, [
                microsoft_id, email, name, avatar_url, 
                user_type, graduation_year, major, enrollment_year
            ]);
            
            return await this.findById(result.id);
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    /**
     * Find by Microsoft ID
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
     * Find by email
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
     * Find by ID
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
     * Update last login
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
     * Get current students
     */
    static async getCurrentStudents() {
        try {
            const sql = 'SELECT * FROM users WHERE user_type = "current" ORDER BY name';
            return await allAsync(sql);
        } catch (error) {
            console.error('Error getting current students:', error);
            throw error;
        }
    }

    /**
     * Get alumni with optional filters
     */
    static async getAlumni(filters = {}) {
        try {
            let sql = 'SELECT * FROM users WHERE user_type = "alumni"';
            const params = [];

            if (filters.graduation_year) {
                sql += ' AND graduation_year = ?';
                params.push(filters.graduation_year);
            }

            if (filters.major) {
                sql += ' AND major = ?';
                params.push(filters.major);
            }

            sql += ' ORDER BY graduation_year DESC, name';
            return await allAsync(sql, params);
        } catch (error) {
            console.error('Error getting alumni:', error);
            throw error;
        }
    }

    /**
     * Get faculty
     */
    static async getFaculty() {
        try {
            const sql = 'SELECT * FROM users WHERE user_type = "faculty" ORDER BY name';
            return await allAsync(sql);
        } catch (error) {
            console.error('Error getting faculty:', error);
            throw error;
        }
    }

    /**
     * Update user type (for graduation)
     */
    static async updateUserType(userId, userType, graduationYear = null) {
        try {
            const sql = `
                UPDATE users 
                SET user_type = ?, 
                    graduation_year = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            await runAsync(sql, [userType, graduationYear, userId]);
            return await this.findById(userId);
        } catch (error) {
            console.error('Error updating user type:', error);
            throw error;
        }
    }

    /**
     * Update alumni network
     */
    static async updateAlumniNetwork(userId, alumniData) {
        try {
            // First, ensure user is marked as alumni
            await this.updateUserType(userId, 'alumni', alumniData.graduation_year);

            const {
                current_employer,
                job_title,
                industry,
                location,
                linkedin_url,
                mentorship_available = false
            } = alumniData;

            // Check if alumni network record exists
            const existing = await getAsync(
                'SELECT * FROM alumni_network WHERE user_id = ?',
                [userId]
            );

            if (existing) {
                // Update existing record
                const sql = `
                    UPDATE alumni_network 
                    SET current_employer = ?,
                        job_title = ?,
                        industry = ?,
                        location = ?,
                        linkedin_url = ?,
                        mentorship_available = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = ?
                `;
                await runAsync(sql, [
                    current_employer, job_title, industry, location, 
                    linkedin_url, mentorship_available, userId
                ]);
            } else {
                // Create new record
                const sql = `
                    INSERT INTO alumni_network (
                        user_id, current_employer, job_title, industry,
                        location, linkedin_url, mentorship_available
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                `;
                await runAsync(sql, [
                    userId, current_employer, job_title, industry,
                    location, linkedin_url, mentorship_available
                ]);
            }

            return await getAsync(
                'SELECT * FROM alumni_network WHERE user_id = ?',
                [userId]
            );
        } catch (error) {
            console.error('Error updating alumni network:', error);
            throw error;
        }
    }

    /**
     * Get alumni network profile
     */
    static async getAlumniNetwork(userId) {
        try {
            const sql = `
                SELECT u.*, a.*
                FROM users u
                LEFT JOIN alumni_network a ON u.id = a.user_id
                WHERE u.id = ? AND u.user_type = 'alumni'
            `;
            return await getAsync(sql, [userId]);
        } catch (error) {
            console.error('Error getting alumni network:', error);
            throw error;
        }
    }

    /**
     * Get mentors
     */
    static async getMentors() {
        try {
            const sql = `
                SELECT u.*, a.*
                FROM users u
                JOIN alumni_network a ON u.id = a.user_id
                WHERE u.user_type = 'alumni' AND a.mentorship_available = 1
                ORDER BY u.name
            `;
            return await allAsync(sql);
        } catch (error) {
            console.error('Error getting mentors:', error);
            throw error;
        }
    }

    /**
     * Get user statistics
     */
    static async getUserStats() {
        try {
            const stats = await getAsync(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN user_type = 'current' THEN 1 ELSE 0 END) as current_count,
                    SUM(CASE WHEN user_type = 'alumni' THEN 1 ELSE 0 END) as alumni_count,
                    SUM(CASE WHEN user_type = 'faculty' THEN 1 ELSE 0 END) as faculty_count,
                    SUM(CASE WHEN user_type = 'staff' THEN 1 ELSE 0 END) as staff_count
                FROM users
            `);
            
            return {
                total: stats.total,
                by_type: {
                    current: { count: stats.current_count || 0 },
                    alumni: { count: stats.alumni_count || 0 },
                    faculty: { count: stats.faculty_count || 0 },
                    staff: { count: stats.staff_count || 0 }
                }
            };
        } catch (error) {
            console.error('Error getting user stats:', error);
            throw error;
        }
    }

    /**
     * Get alumni statistics
     */
    static async getAlumniStats() {
        try {
            const stats = await getAsync(`
                SELECT 
                    COUNT(*) as total_alumni,
                    COUNT(DISTINCT major) as distinct_majors,
                    COUNT(DISTINCT graduation_year) as graduation_years,
                    SUM(CASE WHEN mentorship_available = 1 THEN 1 ELSE 0 END) as mentors_available,
                    GROUP_CONCAT(DISTINCT industry) as industries
                FROM users u
                LEFT JOIN alumni_network a ON u.id = a.user_id
                WHERE u.user_type = 'alumni'
            `);
            
            return stats || {
                total_alumni: 0,
                distinct_majors: 0,
                graduation_years: 0,
                mentors_available: 0,
                industries: ''
            };
        } catch (error) {
            console.error('Error getting alumni stats:', error);
            throw error;
        }
    }

    /**
     * Search users
     */
    static async searchUsers(query) {
        try {
            const searchTerm = `%${query}%`;
            const sql = `
                SELECT id, email, name, avatar_url, user_type, graduation_year, major
                FROM users
                WHERE name LIKE ? 
                   OR email LIKE ? 
                   OR major LIKE ?
                ORDER BY 
                    CASE user_type
                        WHEN 'current' THEN 1
                        WHEN 'alumni' THEN 2
                        WHEN 'faculty' THEN 3
                        ELSE 4
                    END,
                    name
            `;
            return await allAsync(sql, [searchTerm, searchTerm, searchTerm]);
        } catch (error) {
            console.error('Error searching users:', error);
            throw error;
        }
    }

    /**
     * Get all users with filters
     */
    static async getAllUsers(filters = {}) {
        try {
            let sql = 'SELECT id, email, name, avatar_url, user_type, graduation_year, major, enrollment_year, created_at, last_login FROM users WHERE 1=1';
            const params = [];

            if (filters.user_type) {
                sql += ' AND user_type = ?';
                params.push(filters.user_type);
            }

            if (filters.major) {
                sql += ' AND major = ?';
                params.push(filters.major);
            }

            if (filters.graduation_year) {
                sql += ' AND graduation_year = ?';
                params.push(filters.graduation_year);
            }

            sql += ' ORDER BY created_at DESC';
            return await allAsync(sql, params);
        } catch (error) {
            console.error('Error getting all users:', error);
            throw error;
        }
    }
}

module.exports = User;
