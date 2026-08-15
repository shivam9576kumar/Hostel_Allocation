import React from 'react';
import HostelCard from './HostelCard';

const HostelList = ({ hostels = [], onSelect, selectedHostel }) => {
  if (!hostels || hostels.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs font-medium text-amber-800">
        No eligible hostels available for your programme/year.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
      <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
        🏠 Available Hostels
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {hostels.map((h) => (
          <HostelCard
            key={h.hostel_id}
            hostel={h}
            onSelect={onSelect}
            isSelected={String(selectedHostel) === String(h.hostel_id)}
          />
        ))}
      </div>
    </div>
  );
};

export default HostelList;