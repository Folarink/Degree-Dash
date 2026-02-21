import React, { useState } from "react";
import Logo from "../images/Logo.png";
import '../styles/Signup.css';

function Signup() {
  const [overlay, setOverlay] = useState(null); // 'signup', 'login', or null

  const handleMicrosoftAuth = () => {
    window.location.href = 'http://localhost:5050/auth/microsoft';
  };

  return (
    <div className="home">
      {/* Main content */}
      <div className="home__content">
        <img src={Logo} alt="Degree Dash Logo" className="home__logo" />
        <h1>Degree Dash</h1>
        <p>TAGLINE 1.</p>
        <p>TAGLINE 2.</p>
        <div className="home__buttons">
          <button className="btn-secondary" onClick={() => setOverlay('login')}>Log in</button>
        </div>
        <small><a href="/about">About</a> · <a href="/contact">Contact</a></small>
      </div>

      {/* Overlay */}
      {overlay && (
        <div className="overlay" onClick={() => setOverlay(null)}>
          <div className="overlay__card" onClick={(e) => e.stopPropagation()}>
            <button className="overlay__close" onClick={() => setOverlay(null)}>✕</button>
            <img src={Logo} alt="Degree Dash Logo" className="overlay__logo" />
            <h1>Welcome to Degree Dash</h1>
            <p>Tagline</p>
            <button className="btn-microsoft" onClick={handleMicrosoftAuth}>
              {overlay === 'signup' ? 'Sign up' : 'Log in'} with Microsoft
            </button>
            <small>
              By continuing, you agree to Degree Dash's Terms of Service and
              acknowledge you've read our Privacy Policy
            </small>
          </div>
        </div>
      )}
    </div>
  );
}

export default Signup;