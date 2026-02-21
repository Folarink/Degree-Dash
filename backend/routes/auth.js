// backend/routes/auth.js
const express = require('express')
const router = express.Router()
const passport = require('passport')
const { ensureAuthenticated } = require('../middleware/auth')

// @route   GET /auth/microsoft
// @desc    Start Microsoft OAuth flow
router.get('/microsoft', (req, res, next) => {
    console.log("Route hit: /auth/microsoft")
    next()
  }, passport.authenticate('microsoft', {
    scope: ['user.read'],
    prompt: 'select_account'
  }))
  
// @route   GET /auth/microsoft/callback
// @desc    Handle Microsoft OAuth callback
router.get('/microsoft/callback',
  passport.authenticate('microsoft', { failureRedirect: `${process.env.FRONTEND_URL}`  }),
  (req, res) => {
   // console.log('Login was successful, User:', req.user.name)
    // Redirect to frontend dashboard
    res.redirect(`${process.env.FRONTEND_URL}/home`)
  }
)

// @route   GET /auth/status
// @desc    Check if user is authenticated
router.get('/status', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      isAuthenticated: true,
      user: req.user
    })
  } else {
    res.json({ isAuthenticated: false })
  }
})

// @route   POST /auth/logout
// @desc    Logout user
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: 'Logout failed' })
    }
    req.session.destroy()
    res.json({ message: 'Logged out successfully' })
  })
})

module.exports = router