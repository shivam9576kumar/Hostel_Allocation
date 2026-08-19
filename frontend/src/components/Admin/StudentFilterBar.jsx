// frontend/src/components/Admin/StudentFilterBar.jsx

import React from 'react';
import { Search, RefreshCw } from 'lucide-react';

const programmes = ['ALL', 'B.Tech', 'B.Tech+M.Tech', 'B.Tech+MBA', 'M.Tech', 'M.Sc', 'PhD'];
const years = ['ALL', '1', '2', '3', '4', '5'];
const genders = ['ALL', 'Male', 'Female'];
const departments = ['ALL', 'CS', 'EE', 'ME', 'CE', 'CH', 'PH', 'MA', 'BT', 'AI', 'VL', 'MC', 'ST', 'CM', 'MT', 'GT'];
const statuses = ['ALL', 'active', 'archived'];
const admissionYears = ['ALL', '2022', '2023', '2024', '2025', '2026'];

const StudentFilterBar = ({ filters, setFilters, onReset }) => {
  const handleChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => handleChange('search', e.target.value)}
            placeholder="Search by roll number, name, or email..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={onReset}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium flex items-center gap-2 transition"
        >
          <RefreshCw className="w-4 h-4" /> Reset
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Select label="Programme" options={programmes} value={filters.programme} onChange={(v) => handleChange('programme', v)} />
        <Select label="Year" options={years} value={filters.year} onChange={(v) => handleChange('year', v)} />
        <Select label="Gender" options={genders} value={filters.gender} onChange={(v) => handleChange('gender', v)} />
        <Select label="Department" options={departments} value={filters.department} onChange={(v) => handleChange('department', v)} />
        <Select label="Status" options={statuses} value={filters.status} onChange={(v) => handleChange('status', v)} />
        <Select label="Admission Year" options={admissionYears} value={filters.admissionYear} onChange={(v) => handleChange('admissionYear', v)} />
      </div>
    </div>
  );
};

const Select = ({ label, options, value, onChange }) => (
  <div className="flex items-center gap-1 text-xs">
    <span className="font-medium text-slate-500">{label}:</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-2 py-1 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

export default StudentFilterBar;
