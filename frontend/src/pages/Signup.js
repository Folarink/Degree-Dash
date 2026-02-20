// Home.js
import React from "react";
import Logo from "../path/to/Logo.png"; // update the path to your logo file

function Home() {
  return (
    <div>
      {/* Main content */}
      <h1>Degree Dash</h1>
      <button id="openSignup">Sign up</button>
      <button id="openLogin">Log in</button>
      <small><a href="/about">About</a></small>
      <small><a href="/contact">Contact</a></small>
      <img src={Logo} alt="Degree Dash Logo" />
      <p>TAGLINE 1.</p>
      <p>TAGLINE 2.</p>
      <p>TAGLINE 3.</p>
      <p>TAGLINE 4.</p>

      {/* Sign up Overlay */}
      <div id="signupOverlay" className="overlay">
        <img src={Logo} alt="Degree Dash Logo" />
        <h1>Welcome to Degree Dash</h1>
        <p>Tagline</p>
        <button id="signupButton">Sign up with Microsoft</button>
        <p></p>
        <small>
          By continuing, you agree to Degree Dash's Terms of Service and acknowledge you've read our Privacy Policy
        </small>
      </div>

      {/* Log in Overlay */}
      <div id="loginOverlay" className="overlay">
        <img src={Logo} alt="Degree Dash Logo" />
        <h1>Welcome to Degree Dash</h1>
        <p>Tagline</p>
        <button id="loginButton">Log in with Microsoft</button>
        <p></p>
        <small>
          By continuing, you agree to Degree Dash's Terms of Service and acknowledge you've read our Privacy Policy
        </small>
      </div>
    </div>
  );
}

export default Home;