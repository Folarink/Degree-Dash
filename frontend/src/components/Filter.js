const Filter = ({ departments, selectedDept, onDeptChange }) => {
  return (
    <select
      value={selectedDept}
      onChange={(e) => onDeptChange(e.target.value)}
    >
      <option value="">All Departments</option>
      {departments.map((dept) => (
        <option key={dept} value={dept}>
          {dept}
        </option>
      ))}
    </select>
  );
};

export default Filter;