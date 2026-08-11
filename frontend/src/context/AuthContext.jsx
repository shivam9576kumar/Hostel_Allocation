import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [userType, setUserType] = useState(localStorage.getItem('userType') || null);
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('userData');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loginAdmin = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/admin/login', { email, password });
      const { token: jwtToken, admin } = res.data;

      localStorage.setItem('token', jwtToken);
      localStorage.setItem('userType', 'admin');
      localStorage.setItem('userData', JSON.stringify(admin));

      setToken(jwtToken);
      setUserType('admin');
      setUser(admin);
      setLoading(false);
      return admin;
    } catch (err) {
      setLoading(false);
      const msg = err.response?.data?.error || 'Admin login failed.';
      setError(msg);
      throw new Error(msg);
    }
  };

  const loginStudent = async (email) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/student/microsoft', { email });
      const { token: jwtToken, student } = res.data;

      localStorage.setItem('token', jwtToken);
      localStorage.setItem('userType', 'student');
      localStorage.setItem('userData', JSON.stringify(student));

      setToken(jwtToken);
      setUserType('student');
      setUser(student);
      setLoading(false);
      return student;
    } catch (err) {
      setLoading(false);
      const msg = err.response?.data?.error || 'Student login failed.';
      setError(msg);
      throw new Error(msg);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    localStorage.removeItem('userData');
    setToken(null);
    setUserType(null);
    setUser(null);
    setError(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('userData', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        userType,
        user,
        loading,
        error,
        setError,
        loginAdmin,
        loginStudent,
        logout,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
