import React from 'react';

const HostelCard = ({ hostel, onSelect, isSelected }) => {
  const isOpen = hostel.status !== 'full';
  return (
    <div
      onClick={() => isOpen && onSelect && onSelect(hostel.hostel_id)}
      className={`bg-white rounded-2xl border-2 p-4 shadow-sm transition ${
        isSelected
          ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-500/20'
          : isOpen
          ? 'border-green-200 hover:border-green-400 hover:shadow-md cursor-pointer'
          : 'border-red-200 opacity-60 cursor-not-allowed'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{hostel.name}</h3>
          <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-600 font-medium">
            {hostel.allowed_gender || hostel.gender || 'All'}
          </span>
        </div>
        <span className={`text-sm font-semibold ${isOpen ? 'text-green-600' : 'text-red-600'}`}>
          {isOpen ? '🟢 Open' : '🔴 Full'}
        </span>
      </div>
      {isOpen && (
        <button className="mt-3 text-xs text-blue-600 font-medium hover:underline flex items-center gap-1">
          Select →
        </button>
      )}
    </div>
  );
};

export default HostelCard;