import React from 'react';
import { Building2, CheckCircle, Users, Lock } from 'lucide-react';

const StatCard = ({ label, value, icon, color }) => {
  const colorStyles = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    rose: 'bg-rose-50 text-rose-600 border-rose-200'
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
      <div>
        <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">{label}</span>
        <span className="text-2xl font-bold text-slate-900 mt-1 block">{value}</span>
      </div>
      <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${colorStyles[color] || colorStyles.blue}`}>
        {React.cloneElement(icon, { className: 'w-6 h-6' })}
      </div>
    </div>
  );
};

const RoomStatsCards = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Total Rooms" value={stats.total || 0} icon={<Building2 />} color="blue" />
      <StatCard label="Vacant" value={stats.vacant || 0} icon={<CheckCircle />} color="emerald" />
      <StatCard label="Occupied / Locked" value={stats.occupied || 0} icon={<Users />} color="amber" />
      <StatCard label="Reserved" value={stats.reserved || 0} icon={<Lock />} color="rose" />
    </div>
  );
};

export default RoomStatsCards;
