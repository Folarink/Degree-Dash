const express = require('express');
const router = express.Router();
const db = require('../database/db');

// GET all courses
router.get('/', (req, res) => {
  const { search, department } = req.query;
  
  let query = `SELECT * FROM course_stats WHERE 1=1`;
  const params = [];

  if (search) {
    query += ` AND (course_name LIKE ? OR course_code LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }
  if (department) {
    query += ` AND department = ?`;
    params.push(department);
  }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ courses: rows });
  });
});

// GET single course
router.get('/:id', (req, res) => {
  const { id } = req.params;

  db.get(`SELECT * FROM course_stats WHERE id = ?`, [id], (err, course) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!course) return res.status(404).json({ message: 'Course not found' });

    // get professors for this course
    db.all(`
      SELECT p.*, cp.role 
      FROM professors p
      JOIN course_professors cp ON p.id = cp.professor_id
      WHERE cp.course_id = ?
    `, [id], (err, professors) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json({ course: { ...course, professors } });
    });
  });
});

// GET reviews for a course
router.get('/:id/reviews', (req, res) => {
  const { id } = req.params;
  const { professorId } = req.query;

  let query = `
    SELECT r.*, u.name as user_name, p.name as professor_name
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    LEFT JOIN professors p ON r.professor_id = p.id
    WHERE r.course_id = ?
  `;
  const params = [id];

  if (professorId) {
    query += ` AND r.professor_id = ?`;
    params.push(professorId);
  }

  query += ` ORDER BY r.created_at DESC`;

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ reviews: rows });
  });
});

// POST review for a course
router.post('/:id/reviews', (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  const { id } = req.params;
  const { professorId, rating, difficulty, comment, wouldRecommend, semesterTaken, yearTaken } = req.body;

  db.run(`
    INSERT INTO reviews 
    (user_id, course_id, professor_id, rating, difficulty, comment, would_recommend, semester_taken, year_taken)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [req.user.id, id, professorId, rating, difficulty, comment, wouldRecommend, semesterTaken, yearTaken],
  function(err) {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: 'Review submitted!', id: this.lastID });
  });
});

module.exports = router;