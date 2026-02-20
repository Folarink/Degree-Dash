import api from './api';

export const getAllCourses = async (search = '', department = '') => {
  const response = await api.get('/courses', {
    params: { search, department }
  });
  return response.data;
};

export const getCourseById = async (id) => {
  const response = await api.get(`/courses/${id}`);
  return response.data;
};
