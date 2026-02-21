const express = require('express');
const router = express.Router();
const db = require('../database/db');

// GET all professors
router.get('/', (req, res) => {
  const { search, department } = req.query;

  let query = `SELECT * FROM professors WHERE 1=1`;
  const params = [];

  if (search) {
    query += ` AND name LIKE ?`;
    params.push(`%${search}%`);
  }
  if (department) {
    query += ` AND department = ?`;
    params.push(department);
  }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ professors: rows });
  });
});

// GET single professor
router.get('/:id', (req, res) => {
  const { id } = req.params;

  db.get(`SELECT * FROM professors WHERE id = ?`, [id], (err, professor) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!professor) return res.status(404).json({ message: 'Professor not found' });

    // get courses this professor teaches
    db.all(`
      SELECT c.*, cp.role
      FROM courses c
      JOIN course_professors cp ON c.id = cp.course_id
      WHERE cp.professor_id = ?
    `, [id], (err, courses) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json({ professor: { ...professor, courses } });
    });
  });
});

// GET reviews for a professor
router.get('/:id/reviews', (req, res) => {
  const { id } = req.params;

  db.all(`
    SELECT r.*, u.name as user_name, c.course_code, c.course_name
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    LEFT JOIN courses c ON r.course_id = c.id
    WHERE r.professor_id = ?
    ORDER BY r.created_at DESC
  `, [id], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ reviews: rows });
  });
});

// POST new professor (students can add)
router.post('/', (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

  const { name, department } = req.body;
  if (!name) return res.status(400).json({ message: 'Name is required' });

  db.run(
    `INSERT OR IGNORE INTO professors (name, department) VALUES (?, ?)`,
    [name, department || 'Unknown'],
    function(err) {
      if (err) return res.status(500).json({ message: err.message });
      res.json({ message: 'Professor added!', id: this.lastID });
    }
  );
});

module.exports = router;