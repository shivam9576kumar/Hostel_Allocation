import React from 'react';
import { Building2, RefreshCw } from 'lucide-react';

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
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-8 space-y-6">
      {/* Header & Reset */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600" />
          Room Selector
        </h2>
        {selectedHostel && (
          <button
            onClick={onReset}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            ← Reset Choices
          </button>
        )}
      </div>

      {/* Step 1: Hostel Selection */}
      <div>
        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
          1. Select Hostel
        </label>
        {hostels.length === 0 ? (
          <p className="text-xs text-amber-600 font-medium">No eligible active hostels match your profile currently.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {hostels.map((h) => {
              const isSelected = String(selectedHostel) === String(h.hostel_id);
              const isOpen = h.status ? h.status === 'Open' : true;
              return (
                <div
                  key={h.hostel_id}
                  onClick={() => onSelectHostel(h.hostel_id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm'
                  }`}
                >
                  <div>
                    <span className="font-bold text-sm text-slate-900 block">{h.name}</span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {h.allowed_gender || 'All'} • {h.allowed_programme || 'General'}
                    </span>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    isOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {isOpen ? '🟢 Open' : '🔴 Full'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Step 2: Block Selection (Pills) */}
      {selectedHostel && (
        <div className="pt-2 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
            2. Select Block
          </label>
          {blocks.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Loading blocks...</p>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {blocks.map((b) => {
                const isSelected = String(selectedBlock) === String(b.block_id);
                return (
                  <button
                    key={b.block_id}
                    onClick={() => onSelectBlock(b.block_id)}
                    className={`px-5 py-2.5 rounded-full border text-xs font-bold transition ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {b.name.toUpperCase()}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Floor Selection (Number Buttons) */}
      {selectedHostel && selectedBlock && (
        <div className="pt-2 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
            3. Select Floor Number
          </label>
          {floors.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Loading floors...</p>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {floors.map((f) => {
                const isSelected = String(selectedFloor) === String(f.floor_id);
                return (
                  <button
                    key={f.floor_id}
                    onClick={() => onSelectFloor(f.floor_id)}
                    className={`w-12 h-12 rounded-lg border font-bold text-sm flex items-center justify-center transition ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-500/30'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-blue-400 hover:bg-blue-50/50'
                    }`}
                  >
                    {f.floor_number}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CascadingDropdown;
