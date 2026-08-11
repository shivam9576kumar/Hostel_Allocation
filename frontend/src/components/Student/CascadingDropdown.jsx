import React from 'react';
import { Building2, Layers, Grid, Home, RefreshCw } from 'lucide-react';

const CascadingDropdown = ({
  hostels = [],
  blocks = [],
  floors = [],
  selectedHostel,
  selectedBlock,
  selectedFloor,
  onSelectHostel,
  onSelectBlock,
  onSelectFloor,
  onReset
}) => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-8">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          Cascading Room Selection
        </h2>
        <button
          onClick={onReset}
          className="text-xs text-slate-500 hover:text-blue-600 font-medium flex items-center gap-1.5 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reset Choices
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Step 1: Hostel Dropdown */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-blue-500" />
            1. Select Hostel
          </label>
          <select
            value={selectedHostel || ''}
            onChange={(e) => onSelectHostel(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          >
            <option value="">-- None (Choose Hostel) --</option>
            {hostels.map((h) => (
              <option key={h.hostel_id} value={h.hostel_id}>
                {h.name} ({h.allowed_gender} | {h.allowed_programme} Yr {h.allowed_year})
              </option>
            ))}
          </select>
          {hostels.length === 0 && (
            <p className="text-xs text-amber-600 mt-1.5">No active hostels match your gender/programme/year currently.</p>
          )}
        </div>

        {/* Step 2: Block Dropdown */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-blue-500" />
            2. Select Block
          </label>
          <select
            disabled={!selectedHostel}
            value={selectedBlock || ''}
            onChange={(e) => onSelectBlock(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed"
          >
            <option value="">-- None (Choose Block) --</option>
            {blocks.map((b) => (
              <option key={b.block_id} value={b.block_id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Step 3: Floor Dropdown */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Grid className="w-4 h-4 text-blue-500" />
            3. Select Floor
          </label>
          <select
            disabled={!selectedBlock}
            value={selectedFloor || ''}
            onChange={(e) => onSelectFloor(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed"
          >
            <option value="">-- None (Choose Floor) --</option>
            {floors.map((f) => (
              <option key={f.floor_id} value={f.floor_id}>
                Floor {f.floor_number}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default CascadingDropdown;
