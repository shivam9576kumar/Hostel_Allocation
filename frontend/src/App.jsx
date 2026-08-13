import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import Login from './components/Student/Login';
import Dashboard from './components/Student/Dashboard';
import AdminLogin from './components/Admin/AdminLogin';
import AdminDashboard from './components/Admin/AdminDashboard';

function App() {
  const { token, userType } = useAuth();
  const [showAdminPortal, setShowAdminPortal] = useState(false);

  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      {token && userType === 'admin' ? (
        <AdminDashboard />
      ) : token && userType === 'student' ? (
        <Dashboard />
      ) : showAdminPortal ? (
        <AdminLogin onSwitchToStudent={() => setShowAdminPortal(false)} />
      ) : (
        <Login onSwitchToAdmin={() => setShowAdminPortal(true)} />
      )}
    </>
  );
}

export default App;
