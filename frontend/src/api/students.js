import api from './axios';

// Get student roster with filters
export const getStudents = (params) => api.get('/admin/students', { params });

// Get student count with filters
export const getStudentCount = (params) => api.get('/admin/students/count', { params });

// Get student profile
export const getStudentProfile = (rollNumber) => api.get(`/admin/students/${rollNumber}/profile`);

// Get student history
export const getStudentHistory = (rollNumber) => api.get(`/admin/students/${rollNumber}/history`);

// Upload students (CSV/Excel or JSON payload)
export const uploadStudents = (data) => {
  if (data instanceof FormData) {
    return api.post('/admin/upload-students', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }
  return api.post('/admin/upload-students', data);
};

// Batch remove students
export const batchRemoveStudents = (data) => api.delete('/admin/students/batch', { data });

// Archive student
export const archiveStudent = (rollNumber) => api.put(`/admin/students/${rollNumber}/archive`);

// Unarchive student (restore from archived)
export const unarchiveStudent = (rollNumber) => api.put(`/admin/students/${rollNumber}/unarchive`);

// Export current roster (CSV)
export const exportStudents = (params) => api.get('/admin/students/export', { params, responseType: 'blob' });

// Get available rooms for assignment
export const getAvailableRooms = (rollNumber) => api.get(`/admin/students/${rollNumber}/available-rooms`);

// Assign student to room
export const assignRoom = (rollNumber, roomId) => api.post(`/admin/students/${rollNumber}/assign-room`, { roomId });
