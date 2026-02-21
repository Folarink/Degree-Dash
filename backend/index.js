//index.js
//import required packages
const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const session = require('express-session')
const passport = require('passport')

// load environment variables 
dotenv.config()

// create Express app
const app = express()
const PORT = process.env.PORT || 5050

// set up cors
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000', //react app
  credentials: true // Allow cookies to be sent
}))

// body parsing middleware
app.use(express.json()) // Parse JSON bodies
app.use(express.urlencoded({ extended: true })) // Parse URL-encoded bodies

//session middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' // HTTPS only in production
  }
}))

// initialize Passport
app.use(passport.initialize())
app.use(passport.session())

// import Passport config
require('./config/passport')(passport)

// Request logging middleware 
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
    next()
  })
  
  // test route
  app.get('/', (req, res) => {
    res.json({ message: 'Degree Dash API is running!' })
  })
  

// import routes
app.use('/auth', require('./routes/auth'))
// app.use('/api/courses', require('./routes/courses'))

// error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack)
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  })
})

// start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Test route: http://localhost:${PORT}`)
  console.log(`Auth route: http://localhost:${PORT}/auth/microsoft`)
})