import { Link } from 'react-router-dom';

const CourseCard = ({ course }) => {
  return (
    <div>
      <h3>{course.code} - {course.title}</h3>
      <p>Instructor: {course.instructor}</p>
      <p>Credits: {course.credits}</p>
      <Link to={`/courses/${course._id}`}>View Course</Link>
    </div>
  );
};

export default CourseCard;