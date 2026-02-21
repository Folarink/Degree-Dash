// backend/routes/courses.js
const express = require('express')
const router = express.Router()
const Course = require('../models/Course')
const { ensureAuthenticated } = require('../middleware/auth')

// @route   GET /api/courses
// @desc    Get all courses with optional filters
// @access  Public
router.get('/', async (req, res) => {
    try {
      // Get query parameters from URL
      // Example: /api/courses?search=computer&department=CS&semester=Fall&year=2024
      const { search, department, semester, year } = req.query
      
      // Create filters object to pass to the model
      const filters = { 
        search,      // Search in title/code
        department,  // Filter by department
        semester,    // Filter by semester
        year         // Filter by year
      }
      
      // Use the Course model (created by Person 1)
      const courses = await Course.findAll(filters)
      
      // Send back the courses
      res.json(courses)
    } catch (error) {
      console.error('Error fetching courses:', error)
      res.status(500).json({ 
        message: 'Error fetching courses',
        error: error.message 
      })
    }
  })

  // @route   GET /api/courses/departments
// @desc    Get list of all departments
// @access  Public
router.get('/departments', async (req, res) => {
    try {
      const departments = await Course.getDepartments()
      res.json(departments)
    } catch (error) {
      console.error('Error fetching departments:', error)
      res.status(500).json({ 
        message: 'Error fetching departments',
        error: error.message 
      })
    }
  })

  // @route   GET /api/courses/:id
// @desc    Get a single course by ID
// @access  Public
router.get('/:id', async (req, res) => {
    try {
      const course = await Course.findById(req.params.id)
      
      if (!course) {
        return res.status(404).json({ message: 'Course not found' })
      }
      
      res.json(course)
    } catch (error) {
      console.error('Error fetching course:', error)
      res.status(500).json({ 
        message: 'Error fetching course',
        error: error.message 
      })
    }
  })