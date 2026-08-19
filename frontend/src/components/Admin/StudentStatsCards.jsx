// frontend/src/components/Admin/StudentStatsCards.jsx

import React from 'react';
import { Users, Clock, Lock, GraduationCap } from 'lucide-react';

const StudentStatsCards = ({ stats = {}, activeFilter, onFilterChange }) => {
  const { total, programmeBreakdown, statusBreakdown } = stats;

  const statusMap = {
    'Pending': { label: 'Pending', icon: Clock, color: 'amber' },
    'Locked': { label: 'Locked', icon: Lock, color: 'blue' },
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Total Students"
        value={total || 0}
        icon={Users}
        color="blue"
        isActive={activeFilter === 'ALL' || activeFilter === null || activeFilter === undefined}
        onClick={() => onFilterChange && onFilterChange('status', 'ALL')}
      />
      {statusBreakdown?.map(item => {
        const config = statusMap[item.booking_status] || { label: item.booking_status, icon: Clock, color: 'gray' };
        const isActive = activeFilter === item.booking_status;
        return (
          <StatCard
            key={item.booking_status}
            label={config.label}
            value={item.count}
            icon={config.icon}
            color={config.color}
            isActive={isActive}
            onClick={() => onFilterChange && onFilterChange('status', item.booking_status)}
          />
        );
      })}
      <StatCard
        label="Programmes"
        value={programmeBreakdown?.length || 0}
        icon={GraduationCap}
        color="purple"
        isClickable={false}
      />
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, color, onClick, isClickable = true, isActive = false }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    gray: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100',
  };

  const clickableClass = isClickable ? 'cursor-pointer' : 'cursor-default';
  const activeClass = (isClickable && isActive) ? 'ring-2 ring-blue-500 border-blue-500 shadow-md' : '';

  return (
    <div
      onClick={isClickable ? onClick : undefined}
      className={`flex items-center gap-4 p-4 rounded-2xl border-2 shadow-sm transition ${colorClasses[color] || colorClasses.blue} ${clickableClass} ${activeClass}`}
    >
      <div className="p-2 rounded-xl bg-white/60">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wider opacity-70">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
};

export default StudentStatsCards;
