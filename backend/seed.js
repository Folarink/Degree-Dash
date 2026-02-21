// seed-new.js (updated for multiple professors)
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'DegreeDashDatabase_new.db');
const db = new sqlite3.Database(dbPath);

async function seedDatabase() {
    console.log('Seeding new database with multiple professor support...');
    
    db.serialize(() => {
        // Insert professors
        console.log('\nInserting professors...');
        const professors = [
            ['Stephane Durocher', 'Computer Science', 'durocher@cs.umanitoba.ca', 'EITC 456'],
            ['Dr. James Anderson', 'Computer Science', 'anderson@cs.umanitoba.ca', 'EITC 457'],
            ['Dr. Sarah Johnson', 'Computer Science', 'johnson@cs.umanitoba.ca', 'EITC 458'],
            ['Dr. Michael Chen', 'Computer Science', 'chen@cs.umanitoba.ca', 'EITC 459'],
            ['Dr. Lisa Martinez', 'Computer Science', 'martinez@cs.umanitoba.ca', 'EITC 460'],
            ['Dr. Robert Wilson', 'Mathematics', 'wilson@math.umanitoba.ca', 'Machray 345'],
            ['Dr. Emily Brown', 'Statistics', 'brown@stat.umanitoba.ca', 'Machray 346']
        ];

        
        const professorStmt = db.prepare(
            'INSERT OR IGNORE INTO professors (name, department, email, office) VALUES (?, ?, ?, ?)'
        );
        
        professors.forEach(p => {
            professorStmt.run(p[0], p[1], p[2], p[3]);
            console.log(`  Added professor: ${p[0]}`);
        });
        professorStmt.finalize();

        // Insert courses
        console.log('\nInserting courses...');
        const courses = [
            ['COMP 1010', 'Introduction to Computer Science I', 'Computer Science', 3, 
             'An introduction to programming using Python.', 'None', 
             'MWF 10:00-11:15', 'Fall', 2024, 60],
            ['COMP 1020', 'Introduction to Computer Science II', 'Computer Science', 3,
             'Object-oriented programming using Java.', 'COMP 1010',
             'TR 13:00-14:30', 'Winter', 2025, 55],
            ['COMP 2140', 'Data Structures and Algorithms', 'Computer Science', 3,
             'Trees, graphs, hash tables, and algorithm analysis.', 'COMP 1020',
             'MWF 11:30-12:45', 'Fall', 2024, 50],
            ['COMP 3030', 'Algorithm Design and Analysis', 'Computer Science', 3,
             'Design and analysis of efficient algorithms.', 'COMP 2140',
             'TR 11:30-13:00', 'Fall', 2024, 45],
            ['COMP 3190', 'Introduction to Artificial Intelligence', 'Computer Science', 3,
             'Search algorithms, knowledge representation, and machine learning.', 'COMP 2140',
             'MWF 09:00-10:15', 'Winter', 2025, 50],
            ['MATH 1240', 'Elementary Discrete Mathematics', 'Mathematics', 3,
             'Logic, set theory, combinatorics, and graph theory.', 'None',
             'MWF 13:00-14:15', 'Fall', 2024, 80],
            ['STAT 1150', 'Introduction to Statistics', 'Statistics', 3,
             'Descriptive statistics, probability, and hypothesis testing.', 'None',
             'TR 10:00-11:30', 'Fall', 2024, 75]
        ];

        const courseStmt = db.prepare(`
            INSERT INTO courses 
            (course_code, course_name, department, credits, description, 
             prerequisites, schedule, semester, year, capacity)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const courseIds = [];
        courses.forEach(c => {
            courseStmt.run(c[0], c[1], c[2], c[3], c[4], c[5], c[6], c[7], c[8], c[9]);
            console.log(`  Added course: ${c[0]} - ${c[1]}`);
        });
        courseStmt.finalize();

        // Get course IDs for linking professors
        db.all('SELECT id, course_code FROM courses', (err, courseRows) => {
            if (err) {
                console.error('Error getting courses:', err);
                return;
            }

            // Link professors to courses (many-to-many)
            console.log('\nLinking professors to courses...');
            const linkStmt = db.prepare(
                'INSERT OR IGNORE INTO course_professors (course_id, professor_id, role) VALUES (?, ?, ?)'
            );

            // Get professor IDs
            db.all('SELECT id, name FROM professors', (err, professorRows) => {
                if (err) {
                    console.error('Error getting professors:', err);
                    return;
                }

                // Create professor map
                const professorMap = {};
                professorRows.forEach(p => {
                    professorMap[p.name] = p.id;
                });

                // Create course map
                const courseMap = {};
                courseRows.forEach(c => {
                    courseMap[c.course_code] = c.id;
                });

                // Link COMP 3030 to multiple professors
                if (courseMap['COMP 3030']) {
                    // Stephane Durocher as primary instructor
                    linkStmt.run(courseMap['COMP 3030'], professorMap['Stephane Durocher'], 'Primary Instructor');
                    // Dr. James Anderson as TA
                    linkStmt.run(courseMap['COMP 3030'], professorMap['Dr. James Anderson'], 'Teaching Assistant');
                    // Dr. Sarah Johnson as guest lecturer
                    linkStmt.run(courseMap['COMP 3030'], professorMap['Dr. Sarah Johnson'], 'Guest Lecturer');
                    console.log('  Linked 3 professors to COMP 3030');
                }

                // Link other courses
                if (courseMap['COMP 1010']) {
                    linkStmt.run(courseMap['COMP 1010'], professorMap['Dr. James Anderson'], 'Primary Instructor');
                }
                if (courseMap['COMP 1020']) {
                    linkStmt.run(courseMap['COMP 1020'], professorMap['Dr. Sarah Johnson'], 'Primary Instructor');
                }
                if (courseMap['COMP 2140']) {
                    linkStmt.run(courseMap['COMP 2140'], professorMap['Dr. Michael Chen'], 'Primary Instructor');
                }
                if (courseMap['COMP 3190']) {
                    linkStmt.run(courseMap['COMP 3190'], professorMap['Dr. Lisa Martinez'], 'Primary Instructor');
                }
                if (courseMap['MATH 1240']) {
                    linkStmt.run(courseMap['MATH 1240'], professorMap['Dr. Robert Wilson'], 'Primary Instructor');
                }
                if (courseMap['STAT 1150']) {
                    linkStmt.run(courseMap['STAT 1150'], professorMap['Dr. Emily Brown'], 'Primary Instructor');
                }

                linkStmt.finalize();
                console.log('  Professor-course links complete!');

                // Insert a test user
                console.log('\nInserting test user...');
                db.run(`
                    INSERT OR IGNORE INTO users (microsoft_id, email, name, avatar_url)
                    VALUES ('test123', 'test@example.com', 'Test User', 'https://example.com/avatar.jpg')
                `);

                // Insert reviews for COMP 3030
                console.log('\nInserting reviews for COMP 3030...');
                db.get('SELECT id FROM users LIMIT 1', (err, user) => {
                    if (err || !user) {
                        console.error('Error getting user:', err);
                        return;
                    }

                    const reviews = [
                        [5, 4, 'Stephane Durocher is absolutely the best professor at University of Manitoba! His teaching style is incredibly clear.', 1],
                        [5, 3, 'Dr. Durocher is a gem! His lectures are engaging and he uses great examples.', 1],
                        [5, 4, 'Took this course last year and it was fantastic. Durocher is known as one of the best profs in the department.', 1]
                    ];

                    const reviewStmt = db.prepare(`
                        INSERT INTO reviews 
                        (user_id, course_id, professor_id, semester_taken, year_taken, 
                         rating, difficulty, comment, would_recommend)
                        VALUES (?, ?, ?, 'Fall', 2024, ?, ?, ?, ?)
                    `);

                    reviews.forEach(review => {
                        reviewStmt.run(user.id, courseMap['COMP 3030'], professorMap['Stephane Durocher'], 
                                     review[0], review[1], review[2], review[3]);
                    });
                    
                    reviewStmt.finalize();
                    console.log('  Added 3 reviews for COMP 3030');

                    // Final counts
                    setTimeout(() => {
                        db.get('SELECT COUNT(*) as count FROM courses', (err, row) => {
                            console.log(`\nTotal courses: ${row.count}`);
                        })
                        db.get('SELECT COUNT(*) as count FROM professors', (err, row) => {
                            console.log(` Total professors: ${row.count}`);
                        });
                        db.get('SELECT COUNT(*) as count FROM course_professors', (err, row) => {
                            console.log(` Total course-professor links: ${row.count}`);
                        });
                        db.get('SELECT COUNT(*) as count FROM reviews', (err, row) => {
                            console.log(` Total reviews: ${row.count}`);
                        });
                        
                        console.log('\n Database seeding complete with multiple professor support!');
                        db.close();
                    }, 1000);
                });
            });
        });
    });
}

seedDatabase();
