import api from './axios';

export const getAllocationRules = (params) => {
  return api.get('/admin/allocation-rules', { params });
};

export const createAllocationRule = (data) => {
  return api.post('/admin/allocation-rules', data);
};

export const updateAllocationRule = (ruleId, data) => {
  return api.put(`/admin/allocation-rules/${ruleId}`, data);
};

export const deleteAllocationRule = (ruleId) => {
  return api.delete(`/admin/allocation-rules/${ruleId}`);
};

export const getHostelRules = (hostelId) => {
  return api.get(`/admin/hostels/${hostelId}/rules`);
};
