import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import HostelManager from './HostelManager';
import AllocationRulesManager from './AllocationRulesManager';
import BlockManager from './BlockManager';
import FloorManager from './FloorManager';
import RoomManager from './RoomManager';
import StudentUpload from './StudentUpload';
import AdminSwapToggle from './AdminSwapToggle';
import AdminSwapRequests from './AdminSwapRequests';
import { Building2, Layers, Grid, DoorClosed, Upload, LogOut, ShieldCheck, ArrowLeftRight, Settings } from 'lucide-react';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('hostels');

  const tabs = [
    { id: 'hostels', label: 'Hostels', icon: Building2 },
    { id: 'rules', label: 'Allocation Rules', icon: ShieldCheck },
    { id: 'blocks', label: 'Blocks', icon: Layers },
    { id: 'floors', label: 'Floors', icon: Grid },
    { id: 'rooms', label: 'Rooms Grid', icon: DoorClosed },
    { id: 'students', label: 'Student Data Upload', icon: Upload },
    { id: 'swaps', label: 'Room Swap Control', icon: ArrowLeftRight }
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* Top Admin Header */}
      <header className="bg-slate-950 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
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
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition ${
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

        {/* Tab View Content */}
        {activeTab === 'hostels' && <HostelManager />}
        {activeTab === 'rules' && <AllocationRulesManager />}
        {activeTab === 'blocks' && <BlockManager />}
        {activeTab === 'floors' && <FloorManager />}
        {activeTab === 'rooms' && <RoomManager />}
        {activeTab === 'students' && <StudentUpload />}
        {activeTab === 'swaps' && (
          <div className="space-y-8">
            <AdminSwapToggle />
            <AdminSwapRequests />
          </div>
        )}

      </main>
    </div>
  );
};

export default AdminDashboard;
