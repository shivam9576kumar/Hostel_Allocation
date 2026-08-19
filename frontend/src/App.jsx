import React, { useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';

// Auth Components
import Login from './components/Student/Login';
import AdminLogin from './components/Admin/AdminLogin';

// Lazy-loaded Components
const Dashboard = lazy(() => import('./components/Student/Dashboard'));
const AdminLayout = lazy(() => import('./components/Admin/AdminLayout'));
const HostelManager = lazy(() => import('./components/Admin/HostelManager'));
const AllocationRulesManager = lazy(() => import('./components/Admin/AllocationRulesManager'));
const HostelDetail = lazy(() => import('./components/Admin/HostelDetail'));
const BlockRules = lazy(() => import('./components/Admin/BlockRules'));
const BlocksManagement = lazy(() => import('./components/Admin/BlocksManagement'));
const FloorsManagement = lazy(() => import('./components/Admin/FloorsManagement'));
const RoomsGrid = lazy(() => import('./components/Admin/RoomsGrid'));
const StudentManagement = lazy(() => import('./components/Admin/StudentManagement'));
const AdminSwapToggle = lazy(() => import('./components/Admin/AdminSwapToggle'));
const AdminSwapRequests = lazy(() => import('./components/Admin/AdminSwapRequests'));
const GlobalSettings = lazy(() => import('./components/Admin/GlobalSettings'));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-500 font-semibold animate-pulse">
    Loading IIT Hostel Portal...
  </div>
);

function App() {
  const { token, userType } = useAuth();
  const [showAdminPortal, setShowAdminPortal] = useState(false);

  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <Suspense fallback={<PageLoader />}>
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

              <Route path="students" element={<StudentManagement />} />
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
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
