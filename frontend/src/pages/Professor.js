// Professor.js
import React from "react";
import Logo from "../path/to/Logo.png"; // update with actual path

function Professor() {
  return (
    <div>
      {/* Upper border */}
      <img src={Logo} alt="Degree Dash Logo" />
      <h3>Degree Dash</h3>

      {/* Search form */}
      <form action="/search" method="get">
        <input type="text" name="query" placeholder="Search..." />
        <button type="submit">Search</button>
      </form>

      {/* Professors container - JS will dynamically populate professor cards */}
      <div className="professors-container"></div>

      {/* Review Popup */}
      <div id="profReviewPopup" className="popup">
        <div className="popup-content">
          <span className="close">&times;</span>
          <h3>Write a Prof Review</h3>
          <form id="reviewForm" method="post" action="/submit-review">
            {/* Hidden input to store which professor the review is for */}
            <input type="hidden" name="profName" id="profName" value="" />

            <textarea
              name="reviewText"
              placeholder="Write your review..."
              rows="4"
              required
            ></textarea>
            <br />
            <button type="submit">Submit Review</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Professor;