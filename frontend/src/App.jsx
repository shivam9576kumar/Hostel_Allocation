import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';

// Auth Components
import Login from './components/Student/Login';
import Dashboard from './components/Student/Dashboard';
import AdminLogin from './components/Admin/AdminLogin';

// Admin Components
import AdminLayout from './components/Admin/AdminLayout';
import HostelManager from './components/Admin/HostelManager';
import AllocationRulesManager from './components/Admin/AllocationRulesManager';
import HostelDetail from './components/Admin/HostelDetail';
import BlockRules from './components/Admin/BlockRules';
import BlocksManagement from './components/Admin/BlocksManagement';
import FloorsManagement from './components/Admin/FloorsManagement';
import RoomManager from './components/Admin/RoomManager';
import RoomsGrid from './components/Admin/RoomsGrid';
import StudentUpload from './components/Admin/StudentUpload';
import AdminSwapToggle from './components/Admin/AdminSwapToggle';
import AdminSwapRequests from './components/Admin/AdminSwapRequests';
import GlobalSettings from './components/Admin/GlobalSettings';

function App() {
  const { token, userType } = useAuth();
  const [showAdminPortal, setShowAdminPortal] = useState(false);

  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      {token && userType === 'admin' ? (
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="hostels" replace />} />
            <Route path="hostels" element={<HostelManager />} />
            <Route path="hostels/:hostelId/blocks" element={<BlocksManagement />} />
            <Route path="blocks" element={<BlocksManagement />} />
            <Route path="hostels/:hostelId/blocks/:blockId/floors" element={<FloorsManagement />} />
            <Route path="floors" element={<FloorsManagement />} />
            <Route path="hostels/:hostelId/blocks/:blockId/floors/:floorId/rooms" element={<RoomsGrid />} />
            <Route path="rooms" element={<RoomsGrid />} />
            
            {/* Allocation Rules Chain Navigation */}
            <Route path="rules" element={<AllocationRulesManager />} />
            <Route path="allocation-rules" element={<AllocationRulesManager />} />
            <Route path="allocation-rules/hostels/:hostelId" element={<HostelDetail />} />
            <Route path="allocation-rules/hostels/:hostelId/blocks/:blockId" element={<BlockRules />} />

            <Route path="students" element={<StudentUpload />} />
            <Route path="settings" element={<GlobalSettings />} />
            <Route path="swaps" element={
              <div className="space-y-8">
                <AdminSwapToggle />
                <AdminSwapRequests />
              </div>
            } />
          </Route>
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      ) : token && userType === 'student' ? (
        <Routes>
          <Route path="/*" element={<Dashboard />} />
        </Routes>
      ) : showAdminPortal ? (
        <AdminLogin onSwitchToStudent={() => setShowAdminPortal(false)} />
      ) : (
        <Login onSwitchToAdmin={() => setShowAdminPortal(true)} />
      )}
    </BrowserRouter>
  );
}

export default App;
