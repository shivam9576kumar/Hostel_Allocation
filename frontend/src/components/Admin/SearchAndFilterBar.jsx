import React, { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { debounce } from 'lodash';

const SearchAndFilterBar = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  showReserved,
  setShowReserved
}) => {
  const [localInput, setLocalInput] = useState(searchTerm);

  // Debounced state update for search to reduce state churn and filtering frequency
  const debouncedSetSearch = useMemo(
    () =>
      debounce((value) => {
        setSearchTerm(value);
      }, 300),
    [setSearchTerm]
  );

  useEffect(() => {
    return () => {
      debouncedSetSearch.cancel();
    };
  }, [debouncedSetSearch]);

  const handleChange = (e) => {
    const value = e.target.value;
    setLocalInput(value);
    debouncedSetSearch(value);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={localInput}
          onChange={handleChange}
          placeholder="Search by room number..."
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="Vacant">Vacant</option>
            <option value="Pending_Pairing">Pending Pairing</option>
            <option value="Locked">Locked (Full)</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition">
          <input
            type="checkbox"
            checked={showReserved}
            onChange={(e) => setShowReserved(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          Show Reserved Rooms
        </label>
      </div>
    </div>
  );
};

export default React.memo(SearchAndFilterBar);
