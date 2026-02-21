import { Link } from 'react-router-dom';
import '../styles/ProfessorCard.css';

const ProfessorCard = ({ professor }) => {
  const getInitials = (name) => {
    return name
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word[0].toUpperCase())
      .filter(letter => letter.match(/[A-Z]/)) // skip "Dr." dot etc
      .slice(-2) // take last 2 initials e.g. J Y from Dr. James Young
      .join('');
  };

  return (
    <Link to={`/professors/${professor._id}`} className="prof-card">
      <div className="prof-card__avatar">
        {getInitials(professor.name)}
      </div>
      <div className="prof-card__info">
        <h3 className="prof-card__name">{professor.name}</h3>
        <p className="prof-card__dept">{professor.department}</p>
        <p className="prof-card__bio">{professor.bio}</p>
      </div>
    </Link>
  );
};

export default ProfessorCard;