import React from 'react';

const RoomsStatsBar = ({ stats }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center gap-6">
      <div className="text-sm font-bold text-slate-800">
        Total Rooms: <span className="text-blue-600 font-extrabold text-base">{stats.total}</span>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
        <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl border border-emerald-200">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          Vacant: <span className="font-extrabold">{stats.vacant}</span>
        </span>
        <span className="flex items-center gap-1.5 bg-amber-50 text-amber-800 px-3 py-1.5 rounded-xl border border-amber-200">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          Pending: <span className="font-extrabold">{stats.pending}</span>
        </span>
        <span className="flex items-center gap-1.5 bg-blue-50 text-blue-800 px-3 py-1.5 rounded-xl border border-blue-200">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
          Locked: <span className="font-extrabold">{stats.locked}</span>
        </span>
        <span className="flex items-center gap-1.5 bg-rose-50 text-rose-800 px-3 py-1.5 rounded-xl border border-rose-200">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          Reserved: <span className="font-extrabold">{stats.reserved}</span>
        </span>
      </div>
    </div>
  );
};

export default RoomsStatsBar;
