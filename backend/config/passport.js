// backend/config/passport.js
module.exports = function(passport) {
    // For now, just a placeholder function
    console.log('Passport config loaded')
    
    // We'll add the actual config later
    passport.serializeUser((user, done) => done(null, user))
    passport.deserializeUser((user, done) => done(null, user))
  }