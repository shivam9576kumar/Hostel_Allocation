// frontend/src/components/Admin/StudentHistoryTabs.jsx

import React, { useState, useEffect } from 'react';
import { Home, Users, RefreshCw, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { getStudentHistory } from '../../api/students';

const StudentHistoryTabs = ({ rollNumber }) => {
  const [activeTab, setActiveTab] = useState('rooms');
  const [data, setData] = useState({ bookings: [], roommates: [], swaps: [], pdfs: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, [rollNumber]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await getStudentHistory(rollNumber);
      setData(res.data.history || { bookings: [], roommates: [], swaps: [], pdfs: [] });
    } catch (err) {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { key: 'rooms', label: 'Rooms', icon: Home },
    { key: 'roommates', label: 'Roommates', icon: Users },
    { key: 'swaps', label: 'Swaps', icon: RefreshCw },
    { key: 'pdfs', label: 'PDFs', icon: FileText },
  ];

  const renderContent = () => {
    if (loading) return <div className="py-4 text-center text-slate-400">Loading...</div>;

    switch (activeTab) {
      case 'rooms':
        return (
          <ul className="space-y-1 text-sm">
            {data.bookings?.length === 0 ? (
              <li className="text-slate-400">No room history.</li>
            ) : (
              data.bookings.map((b, i) => (
                <li key={i} className="border-b border-slate-100 py-1.5 flex items-center justify-between">
                  <span className="font-semibold text-slate-800">
                    Room {b.Room?.room_number ? String(b.Room.room_number).padStart(3, '0') : 'N/A'} ({b.Room?.Floor?.Block?.Hostel?.name || 'Hostel'}, Block {b.Room?.Floor?.Block?.name || '-'}, Floor {b.Room?.Floor?.floor_number ?? '-'})
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {new Date(b.booking_date).toLocaleDateString()}
                  </span>
                </li>
              ))
            )}
          </ul>
        );

      case 'roommates':
        return (
          <ul className="space-y-1 text-sm">
            {!data.roommates || data.roommates.length === 0 ? (
              <li className="text-slate-400 py-2">No roommates assigned.</li>
            ) : (
              data.roommates.map((roommate, i) => (
                <li key={i} className="border-b border-slate-100 py-2 flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-slate-900">{roommate.full_name}</span>
                    <span className="text-xs text-slate-400 font-mono ml-2">({roommate.roll_number})</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-500">
                    {roommate.programme} &bull; Year {roommate.year} {roommate.department ? `(${roommate.department})` : ''}
                  </div>
                </li>
              ))
            )}
          </ul>
        );

      case 'swaps':
        return (
          <ul className="space-y-1 text-sm">
            {!data.swaps || data.swaps.length === 0 ? (
              <li className="text-slate-400 py-2">No swap history.</li>
            ) : (
              data.swaps.map((s, i) => (
                <li key={i} className="border-b border-slate-100 py-1.5 flex items-center justify-between">
                  <span className="font-semibold text-slate-800">
                    {s.swap_type} swap ({s.status}) &bull; Initiator: {s.Initiator?.full_name || s.initiator_roll}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {new Date(s.created_at).toLocaleDateString()}
                  </span>
                </li>
              ))
            )}
          </ul>
        );

      case 'pdfs':
        return (
          <ul className="space-y-1 text-sm">
            {!data.pdfs || data.pdfs.length === 0 ? (
              <li className="text-slate-400 py-2">No PDF history.</li>
            ) : (
              data.pdfs.map((p, i) => (
                <li key={i} className="border-b border-slate-100 py-1.5 flex items-center justify-between">
                  <span className="font-semibold text-slate-800">
                    Version {p.version} &bull; {p.is_swap ? 'Swap PDF' : 'Allocation PDF'}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {new Date(p.generated_at).toLocaleDateString()}
                  </span>
                </li>
              ))
            )}
          </ul>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-2">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === tab.key
                ? 'bg-blue-100 text-blue-700 font-bold'
                : 'hover:bg-slate-100 text-slate-500'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-3 max-h-48 overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default StudentHistoryTabs;
