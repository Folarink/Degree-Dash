const SearchBar = ({ value, onChange }) => {
  return (
    <input
      type="text"
      placeholder="Search courses..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
};

export default SearchBar;