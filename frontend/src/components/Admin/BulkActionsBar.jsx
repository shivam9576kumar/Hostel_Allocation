import React from 'react';
import { CheckSquare, Square, Lock, Unlock, Trash2 } from 'lucide-react';

const BulkActionsBar = ({
  selectedCount,
  totalCount,
  onSelectAll,
  allSelected,
  onReserve,
  onUnreserve,
  onDelete
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
      <button
        onClick={onSelectAll}
        className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-blue-600 transition"
      >
        {allSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-slate-400" />}
        {allSelected ? 'Deselect All' : 'Select All'} ({selectedCount}/{totalCount})
      </button>

      {selectedCount > 0 && (
        <div className="flex items-center gap-2">
          <button
            onClick={onReserve}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700 rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Lock className="w-3.5 h-3.5" /> Reserve ({selectedCount})
          </button>
          <button
            onClick={onUnreserve}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Unlock className="w-3.5 h-3.5" /> Unreserve ({selectedCount})
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete ({selectedCount})
          </button>
        </div>
      )}
    </div>
  );
};

export default BulkActionsBar;
