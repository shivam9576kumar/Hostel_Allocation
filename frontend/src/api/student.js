import api from './axios';

export const getDashboard = () => api.get('/student/dashboard');
export const getEligibleHostels = () => api.get('/student/hostels');
export const getBlocks = (hostelId) => api.get(`/student/blocks/${hostelId}`);
export const getFloors = (blockId) => api.get(`/student/floors/${blockId}`);
export const getRooms = (floorId) => api.get(`/student/rooms/${floorId}`);
export const bookRoom = (roomId) => api.post(`/student/rooms/${roomId}/book`);
export const pairRoom = (roomId, code) => api.post(`/student/rooms/${roomId}/pair`, { code });
export const pairByCode = (code) => api.post('/student/pair-by-code', { code });
export const getActiveSwap = () => api.get('/student/swap/active');
export const getEligibleSwapRooms = () => api.get('/student/swap/eligible-rooms');
export const getSwapRequests = () => api.get('/student/swap/requests');
export const requestSwap = (targetRoomId) => api.post('/student/swap/request', { target_room_id: targetRoomId });
export const consentSwap = (requestId, status) => api.post(`/student/swap/consent/${requestId}`, { status });
export const cancelSwap = (requestId) => api.delete(`/student/swap/cancel/${requestId}`);
