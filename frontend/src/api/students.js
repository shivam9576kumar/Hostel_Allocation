import api from './axios';

/**
 * Get student count with filters
 * @param {Object} filters - { status, gender, programme, year, search }
 * @returns {Promise} - { total, programmeBreakdown, genderBreakdown, statusBreakdown }
 */
export const getStudentCount = (filters) => {
  const params = {};
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'ALL' && value !== '') {
        params[key] = value;
      }
    });
  }
  return api.get('/admin/students/count', { params });
};
