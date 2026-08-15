import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Unlock, Trash2, Eye, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const FloorCard = ({ floor, hostelId, blockId, onClick, onRefresh }) => {
  const navigate = useNavigate();

  const handleViewRooms = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick(floor);
    } else {
      const hId = hostelId || floor.hostel_id || 15;
      const bId = blockId || floor.block_id || 1;
      navigate(`/admin/hostels/${hId}/blocks/${bId}/floors/${floor.floor_id}/rooms`);
    }
  };

  const toggleReservation = async () => {
    try {
      await api.put(`/admin/floors/${floor.floor_id}/reserve`, {
        is_reserved: !floor.is_reserved
      });
      toast.success(`Floor ${floor.floor_number} ${floor.is_reserved ? 'unreserved' : 'reserved'}`);
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error('Failed to toggle reservation');
    }
  };

  const deleteFloor = async () => {
    if (!window.confirm(`Delete Floor ${floor.floor_number} and all its rooms?`)) return;
    try {
      await api.delete(`/admin/floors/${floor.floor_id}`);
      toast.success(`Floor ${floor.floor_number} deleted`);
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error('Failed to delete floor');
    }
  };

  return (
    <div
      onClick={() => onClick && onClick(floor)}
      className={`bg-white border-2 rounded-2xl p-5 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between ${
        floor.is_reserved ? 'border-rose-200 hover:border-rose-300' : 'border-slate-200 hover:border-blue-300'
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-400" />
              <span className="text-lg font-bold text-slate-800">
                Floor {floor.floor_number}
                {floor.floor_number === 0 && <span className="text-xs font-normal text-slate-400 ml-1">(Ground)</span>}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-700">{floor.totalRooms || 0} Rooms</span>
              {floor.reservedRooms > 0 && (
                <span className="text-rose-600 font-bold">({floor.reservedRooms} reserved)</span>
              )}
              {floor.lockedRooms > 0 && (
                <span className="text-blue-600 font-bold">({floor.lockedRooms} locked)</span>
              )}
            </div>
          </div>
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
            floor.is_reserved 
              ? 'bg-rose-100 text-rose-700 border-rose-200' 
              : 'bg-emerald-100 text-emerald-700 border-emerald-200'
          }`}>
            {floor.is_reserved ? '🔴 Reserved' : '🟢 Active'}
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
        <button
          onClick={(e) => { e.stopPropagation(); toggleReservation(); }}
          className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 transition flex items-center gap-1 text-slate-700"
        >
          {floor.is_reserved ? <Unlock className="w-3 h-3 text-emerald-600" /> : <Lock className="w-3 h-3 text-rose-600" />}
          {floor.is_reserved ? 'Unreserve' : 'Reserve'}
        </button>
        <button
          onClick={handleViewRooms}
          className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 transition flex items-center gap-1 text-slate-700"
        >
          <Eye className="w-3 h-3 text-blue-600" /> View Rooms
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); deleteFloor(); }}
          className="px-2 py-1 text-xs font-semibold rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition flex items-center gap-1 ml-auto"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export default FloorCard;
