import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Home, Building2, Layers, Grid } from 'lucide-react';

const Breadcrumb = ({ hostelId, blockId, floorId, hostelName, blockName, floorNumber, onBack }) => {
  const navigate = useNavigate();

  const isGroundFloor = floorNumber === 0;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
      <button
        onClick={onBack || (() => navigate(-1))}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition mr-2"
      >
        <ChevronLeft className="w-4 h-4" />
        Back
      </button>

      <span className="text-slate-300">|</span>

      <button
        onClick={() => navigate(`/admin/hostels`)}
        className="hover:text-blue-600 font-semibold transition flex items-center gap-1 text-slate-700"
      >
        <Building2 className="w-3.5 h-3.5 text-blue-600" />
        {hostelName || 'Hostel'}
      </button>

      <span className="text-slate-300 font-bold">→</span>

      <button
        onClick={() => hostelId ? navigate(`/admin/hostels/${hostelId}/blocks`) : navigate('/admin/blocks')}
        className="hover:text-blue-600 font-semibold transition flex items-center gap-1 text-slate-700"
      >
        <Layers className="w-3.5 h-3.5 text-blue-600" />
        {blockName || 'Block'}
      </button>

      <span className="text-slate-300 font-bold">→</span>

      <button
        onClick={() => hostelId && blockId ? navigate(`/admin/hostels/${hostelId}/blocks/${blockId}/floors`) : navigate('/admin/floors')}
        className="hover:text-blue-600 font-semibold transition flex items-center gap-1 text-slate-700"
      >
        <Grid className="w-3.5 h-3.5 text-blue-600" />
        Floor {floorNumber !== undefined ? floorNumber : ''} {isGroundFloor ? '(Ground Floor)' : ''}
      </button>

      <span className="text-slate-300 font-bold">→</span>

      <span className="font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 text-xs">
        Rooms Grid
      </span>
    </div>
  );
};

export default Breadcrumb;
