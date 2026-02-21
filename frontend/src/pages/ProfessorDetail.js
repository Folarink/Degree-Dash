import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { professors, courses, reviews } from "../data/dummyData";
import '../styles/CourseDetail.css';

function ProfessorDetail() {
  const { id } = useParams();

  const [reviewText, setReviewText]         = useState("");
  const [rating, setRating]                 = useState(0);
  const [hoverRating, setHoverRating]       = useState(0);
  const [popupOpen, setPopupOpen]           = useState(false);
  const [localReviews, setLocalReviews]     = useState(reviews);
  const [selectedCourse, setSelectedCourse] = useState('');

  const professor = professors.find(p => p._id === id);
  if (!professor) return <p>Professor not found</p>;

  // find courses this professor has taught
  const professorCourses = courses.filter(c =>
    c.professors.includes(id)
  );

  // reviews for this professor
  const professorReviews = localReviews.filter(r => r.professorId === id);

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    const newReview = {
      _id: Date.now().toString(),
      courseId: selectedCourse,
      professorId: id,
      text: reviewText,
      rating,
      user: 'You',
    };
    setLocalReviews(prev => [...prev, newReview]);
    setReviewText('');
    setRating(0);
    setSelectedCourse('');
    setPopupOpen(false);
  };

  return (
    <div className="course-detail">

      {/* Professor Info */}
      <div className="course-detail__info">
        <div className="prof-detail__avatar">
          {professor.name.charAt(0)}
        </div>
        <h1>{professor.name}</h1>
        <p className="course-detail__dept">{professor.department}</p>
        {professor.bio && (
          <p className="course-detail__desc">{professor.bio}</p>
        )}
      </div>

      {/* Courses taught */}
      <div className="professor-filter">
        <h2>Courses Taught</h2>
        <div className="professor-filter__buttons">
          {professorCourses.length === 0 ? (
            <p>No courses listed</p>
          ) : (
            professorCourses.map(course => (
              <span key={course._id} className="filter-btn">
                {course.code} - {course.title}
              </span>
            ))
          )}
        </div>
      </div>

      {/* Reviews */}
      <div className="reviews-section">
        <div className="reviews-section__header">
          <h2>Student Reviews</h2>
          <button className="btn-primary" onClick={() => setPopupOpen(true)}>
            Write a Review
          </button>
        </div>

        {professorReviews.length === 0 ? (
          <div className="no-reviews">
            <p>No reviews yet — be the first!</p>
          </div>
        ) : (
          professorReviews.map(review => (
            <div key={review._id} className="review-card">
              <div className="review-card__stars">
                {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
              </div>
              <p>{review.text}</p>
              <small>
                {review.user}
                {review.courseId && ` · ${courses.find(c => c._id === review.courseId)?.code}`}
              </small>
            </div>
          ))
        )}
      </div>

      {/* Review Popup */}
      {popupOpen && (
        <div className="popup" onClick={() => setPopupOpen(false)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setPopupOpen(false)}>✕</button>
            <h3>Review {professor.name}</h3>

            {/* Course selector */}
            <label>Which course? (optional)</label>
            <select
              className="prof-select"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
            >
              <option value="">Select a course...</option>
              {professorCourses.map(course => (
                <option key={course._id} value={course._id}>
                  {course.code} - {course.title}
                </option>
              ))}
            </select>

            {/* Star Rating */}
            <label>Rating</label>
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map(star => (
                <span
                  key={star}
                  className={star <= (hoverRating || rating) ? 'star filled' : 'star'}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                >
                  ★
                </span>
              ))}
            </div>

            <form onSubmit={handleReviewSubmit}>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Write your review..."
                rows="4"
                required
              />
              <button type="submit" disabled={rating === 0}>
                Submit Review
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfessorDetail;