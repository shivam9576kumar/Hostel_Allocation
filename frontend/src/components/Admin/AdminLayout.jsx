import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Building2, Layers, Grid, DoorClosed, Users, LogOut, ShieldCheck, ArrowLeftRight, Clock } from 'lucide-react';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/rooms')) return 'rooms';
    if (path.includes('/floors')) return 'floors';
    if (path.includes('/blocks')) return 'blocks';
    if (path.includes('/rules')) return 'rules';
    if (path.includes('/students')) return 'students';
    if (path.includes('/settings')) return 'settings';
    if (path.includes('/swaps')) return 'swaps';
    if (path.includes('/hostels')) return 'hostels';
    return 'hostels';
  };

  const activeTab = getActiveTab();

  const tabs = [
    { id: 'hostels', label: 'Hostels', path: '/admin/hostels', icon: Building2 },
    { id: 'blocks', label: 'Blocks', path: '/admin/blocks', icon: Layers },
    { id: 'floors', label: 'Floors', path: '/admin/floors', icon: Grid },
    { id: 'rooms', label: 'Rooms Grid', path: '/admin/rooms', icon: DoorClosed },
    { id: 'rules', label: 'Allocation Rules', path: '/admin/allocation-rules', icon: ShieldCheck },
    { id: 'students', label: 'Student Roster', path: '/admin/students', icon: Users },
    { id: 'settings', label: 'Booking Window', path: '/admin/settings', icon: Clock },
    { id: 'swaps', label: 'Room Swap Control', path: '/admin/swaps', icon: ArrowLeftRight }
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* Top Admin Header */}
      <header className="bg-slate-950 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/admin')}>
            <div className="w-9 h-9 bg-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center border border-amber-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight block">IIT Hostel Administration</span>
              <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider block">Super Admin Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="text-sm font-bold text-slate-100 block">{user?.name}</span>
              <span className="text-xs text-slate-400 font-mono">{user?.email} ({user?.role})</span>
            </div>
            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Tabbed Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={`flex-1 min-w-[130px] py-3 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Dynamic Nested Route Component */}
        <div className="bg-transparent">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
