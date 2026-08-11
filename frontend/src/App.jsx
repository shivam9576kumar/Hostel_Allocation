import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Login from './components/Student/Login';
import Dashboard from './components/Student/Dashboard';
import AdminLogin from './components/Admin/AdminLogin';
import AdminDashboard from './components/Admin/AdminDashboard';

function App() {
  const { token, userType } = useAuth();
  const [showAdminPortal, setShowAdminPortal] = useState(false);

  if (token && userType === 'admin') {
    return <AdminDashboard />;
  }

  if (token && userType === 'student') {
    return <Dashboard />;
  }

  if (showAdminPortal) {
    return <AdminLogin onSwitchToStudent={() => setShowAdminPortal(false)} />;
  }

  return <Login onSwitchToAdmin={() => setShowAdminPortal(true)} />;
}

export default App;
