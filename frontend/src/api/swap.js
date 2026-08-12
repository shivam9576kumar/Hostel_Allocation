import api from './axios';

export const getEligibleRooms = () => api.get('/student/swap/eligible-rooms');
export const getStudentSwapRequests = () => api.get('/student/swap/requests');
export const createSwapRequest = (data) => api.post('/student/swap/request', data);
export const giveConsent = (requestId, consent) => api.post(`/student/swap/consent/${requestId}`, { consent });
export const getSwapStatus = (requestId) => api.get(`/student/swap/status/${requestId}`);
export const cancelRequest = (requestId) => api.delete(`/student/swap/cancel/${requestId}`);
export const getSwapActive = () => api.get('/student/swap/active');

// Admin API
export const toggleSwapActivity = (isActive) => api.post('/admin/swap/toggle', { isActive });
export const getAdminSwapActive = () => api.get('/admin/swap/active');
export const adminListRequests = (params) => api.get('/admin/swap/requests', { params });
export const adminForceExecute = (requestId) => api.post(`/admin/swap/execute/${requestId}`);
export const adminCancelRequest = (requestId) => api.delete(`/admin/swap/cancel/${requestId}`);
