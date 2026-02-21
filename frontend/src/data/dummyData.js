export const courses = [
  {
    _id: '1',
    code: 'COMP1010',
    title: 'Intro to Computer Science',
    department: 'Computer Science',
    description: 'An introduction to programming and computational thinking.',
    professors: ['1', '2'], // professor ids
  },
  {
    _id: '2',
    code: 'COMP2140',
    title: 'Data Structures',
    department: 'Computer Science',
    description: 'Study of fundamental data structures and algorithms.',
    professors: ['1', '3'],
  },
  {
    _id: '3',
    code: 'MATH1500',
    title: 'Intro to Calculus',
    department: 'Mathematics',
    description: 'Limits, derivatives and integrals.',
    professors: ['4'],
  },
  {
    _id: '4',
    code: 'MATH2720',
    title: 'Multivariable Calculus',
    department: 'Mathematics',
    description: 'Extends calculus to functions of several variables.',
    professors: ['4', '5'],
  },
  {
    _id: '5',
    code: 'COMP3430',
    title: 'Operating Systems',
    department: 'Computer Science',
    description: 'Process management, memory, file systems.',
    professors: ['2'],
  },
  {
    _id: '6',
    code: 'COMP3170',
    title: 'Analysis of Algorithms',
    department: 'Computer Science',
    description: 'Algorithm design, complexity and correctness.',
    professors: ['3'],
  },
];

export const professors = [
  {
    _id: '1',
    name: 'Dr. James Yong',
    department: 'Computer Science',
    bio: 'Specializes in HCI.',
  },
  {
    _id: '2',
    name: 'Dr. Tristan Miller',
    department: 'Computer Science',
    bio: 'Research interests in computational linguistics.',
  },
  {
    _id: '3',
    name: 'Dr. Heather Matheson',
    department: 'Computer Science',
    bio: 'Focuses on object oritentation and databases.',
  },
  {
    _id: '4',
    name: 'Dr. Varvara Sharjsjsjos',
    department: 'Mathematics',
    bio: 'Specializes in calculus and real analysis.',
  },
  {
    _id: '5',
    name: 'Dr. Michael Wong',
    department: 'Mathematics',
    bio: 'Research in differential equations and applied mathematics.',
  },
];

export const reviews = [
  {
    _id: '1',
    courseId: '1',
    professorId: '1',
    text: 'Great intro course, very beginner friendly!',
    rating: 5,
    user: 'Student A',
  },
  {
    _id: '2',
    courseId: '1',
    professorId: '2',
    text: 'Decent course but moves fast.',
    rating: 3,
    user: 'Student B',
  },
  {
    _id: '3',
    courseId: '2',
    professorId: '1',
    text: 'Challenging but very rewarding.',
    rating: 4,
    user: 'Student C',
  },
];