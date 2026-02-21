import api from './api';

export const logout = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};

export const checkAuthStatus = async () => {
  const response = await api.get('/auth/status');
  return response.data;
};