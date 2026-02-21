const MicrosoftStrategy = require('passport-microsoft').Strategy

module.exports = function(passport) {
  console.log('🔧 Configuring Passport...')
  console.log('Microsoft Client ID:', process.env.MICROSOFT_CLIENT_ID)
  console.log('Microsoft Callback:', process.env.MICROSOFT_CALLBACK_URL)
  
  // serialize user
  passport.serializeUser((user, done) => {
    console.log('✅ Serializing user:', user.name)
    done(null, user)
  })

  // deserialize user
  passport.deserializeUser((user, done) => {
    console.log('✅ Deserializing user:', user.name)
    done(null, user)
  })

  // microsoft Strategy
  try {
    passport.use(
      new MicrosoftStrategy(
        {
          clientID: process.env.MICROSOFT_CLIENT_ID,
          clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
          callbackURL: process.env.MICROSOFT_CALLBACK_URL,
          tenant: process.env.MICROSOFT_TENANT,
          scope: ['user.read']
        },
        async function(accessToken, refreshToken, profile, done) {
          try {
            console.log('✅ Microsoft profile received:', profile.displayName)
            const user = {
              microsoftId: profile.id,
              email: profile.emails?.[0]?.value || '',
              name: profile.displayName,
              firstName: profile.name?.givenName,
              lastName: profile.name?.familyName
            }
            return done(null, user)
          } catch (error) {
            console.error('❌ Auth error:', error)
            return done(error, null)
          }
        }
      )
    )
    console.log('✅ Microsoft Strategy configured successfully')
  } catch (error) {
    console.error('❌ Error configuring Microsoft Strategy:', error)
  }
}