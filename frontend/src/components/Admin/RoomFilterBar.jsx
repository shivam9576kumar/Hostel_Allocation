import React from 'react';
import { Search, Filter, RotateCcw } from 'lucide-react';

const RoomFilterBar = ({ 
  filters, 
  setFilters, 
  hostels = [], 
  blocks = [], 
  floors = [], 
  onReset 
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by room number, student name, or roll number..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
        />
      </div>

      {/* Filter Dropdowns Grid */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {/* Hostel Filter */}
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Hostel</label>
          <select
            value={filters.hostel}
            onChange={(e) => setFilters({ ...filters, hostel: e.target.value })}
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
          >
            <option value="ALL">All Hostels</option>
            {hostels.map(h => (
              <option key={h.hostel_id} value={h.name}>{h.name}</option>
            ))}
          </select>
        </div>

        {/* Block Filter */}
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Block</label>
          <select
            value={filters.block}
            onChange={(e) => setFilters({ ...filters, block: e.target.value })}
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
          >
            <option value="ALL">All Blocks</option>
            {blocks.map(b => (
              <option key={b.block_id} value={b.name}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* Floor Filter */}
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Floor</label>
          <select
            value={filters.floor}
            onChange={(e) => setFilters({ ...filters, floor: e.target.value })}
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
          >
            <option value="ALL">All Floors</option>
            {floors.map(f => (
              <option key={f.floor_id} value={String(f.floor_number)}>Floor {f.floor_number}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
          >
            <option value="ALL">All Statuses</option>
            <option value="Vacant">Vacant</option>
            <option value="Pending_Pairing">Pending Pairing</option>
            <option value="Locked">Locked</option>
          </select>
        </div>

        {/* Occupancy Filter */}
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Occupancy</label>
          <select
            value={filters.occupancy}
            onChange={(e) => setFilters({ ...filters, occupancy: e.target.value })}
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
          >
            <option value="ALL">All Occupancies</option>
            <option value="0/2">0/2 (Empty)</option>
            <option value="1/2">1/2</option>
            <option value="2/2">2/2 (Full)</option>
            <option value="0/3">0/3 (Empty)</option>
            <option value="1/3">1/3</option>
            <option value="2/3">2/3</option>
            <option value="3/3">3/3 (Full)</option>
          </select>
        </div>

        {/* Reservation Filter */}
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Reservation</label>
          <select
            value={filters.reservation}
            onChange={(e) => setFilters({ ...filters, reservation: e.target.value })}
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
          >
            <option value="ALL">All Rooms</option>
            <option value="ACTIVE">Visible (Active)</option>
            <option value="RESERVED">Reserved (Hidden)</option>
          </select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
        <button
          onClick={onReset}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Filters
        </button>
      </div>
    </div>
  );
};

export default RoomFilterBar;
