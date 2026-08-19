import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Unlock, Trash2, Eye, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import ConfirmDialog from '../Common/ConfirmDialog';

const FloorCard = ({ floor, hostelId, blockId, onClick, onRefresh }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: 'danger',
    title: '',
    message: '',
    details: [],
    confirmLabel: '',
    onConfirm: () => {},
  });

  const toggleReservation = () => {
    const isReserved = floor.is_reserved;
    setConfirmDialog({
      isOpen: true,
      type: isReserved ? 'info' : 'warning',
      title: `${isReserved ? 'Unreserve' : 'Reserve'} Floor ${floor.floor_number}?`,
      message: `Are you sure you want to ${isReserved ? 'unreserve' : 'reserve'} Floor ${floor.floor_number}?`,
      details: isReserved
        ? ['Floor will become visible to students', 'All rooms on this floor will be active']
        : ['Floor will be hidden from students', 'All rooms on this floor will be reserved'],
      confirmLabel: isReserved ? 'Unreserve Floor' : 'Reserve Floor',
      onConfirm: async () => {
        try {
          await api.put(`/admin/floors/${floor.floor_id}/reserve`, {
            is_reserved: !isReserved
          });
          toast.success(`Floor ${floor.floor_number} ${isReserved ? 'unreserved' : 'reserved'}`);
          if (onRefresh) onRefresh();
        } catch (err) {
          toast.error('Failed to toggle reservation');
        } finally {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const deleteFloor = () => {
    setConfirmDialog({
      isOpen: true,
      type: 'danger',
      title: `Delete Floor ${floor.floor_number}?`,
      message: `Are you sure you want to permanently delete Floor ${floor.floor_number}?`,
      details: [
        '⚠️ This action CANNOT be undone',
        `All rooms on Floor ${floor.floor_number} will be deleted`,
        'All student bookings in these rooms will be deleted',
        'Students assigned to these rooms will be reset to "Pending"',
        'The floor itself will be removed from the system',
      ],
      confirmLabel: 'Delete Floor',
      onConfirm: async () => {
        setLoading(true);
        try {
          await api.delete(`/admin/floors/${floor.floor_id}`);
          toast.success(`Floor ${floor.floor_number} deleted successfully.`);
          if (onRefresh) onRefresh();
        } catch (err) {
          toast.error(err.response?.data?.error || 'Failed to delete floor');
        } finally {
          setLoading(false);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  return (
    <>
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
            onClick={(e) => {
              e.stopPropagation();
              if (onClick) onClick(floor);
            }}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 transition flex items-center gap-1 text-slate-700 shadow-sm"
          >
            <Eye className="w-3.5 h-3.5 text-blue-600" /> View
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.location.href = `/admin/rooms?floorId=${floor.floor_id}`;
            }}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition flex items-center gap-1 shadow-sm"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-600" /> Manage Rooms
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); toggleReservation(); }}
            disabled={loading}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 transition flex items-center gap-1 text-slate-700 disabled:opacity-50"
          >
            {floor.is_reserved ? <Unlock className="w-3 h-3 text-emerald-600" /> : <Lock className="w-3 h-3 text-rose-600" />}
            {floor.is_reserved ? 'Unreserve' : 'Reserve'}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); deleteFloor(); }}
            disabled={loading}
            className="px-2 py-1 text-xs font-semibold rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition flex items-center gap-1 ml-auto disabled:opacity-50"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        type={confirmDialog.type}
        title={confirmDialog.title}
        message={confirmDialog.message}
        details={confirmDialog.details}
        confirmLabel={confirmDialog.confirmLabel}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </>
  );
};

export default FloorCard;
