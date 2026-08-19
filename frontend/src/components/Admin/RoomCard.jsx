import React, { useState } from 'react';
import { Users, Lock, Unlock, Trash2, Clock, Square, CheckSquare, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import ConfirmDialog from '../Common/ConfirmDialog';
import ManageRoomModal from './ManageRoomModal';

const formatRoomNumber = (num) => {
  if (num === undefined || num === null) return '';
  return String(num).padStart(3, '0');
};

const RoomCard = ({
  room,
  isSelected,
  onToggleSelect,
  onClick,
  onRefresh
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: 'danger',
    title: '',
    message: '',
    details: [],
    confirmLabel: '',
    onConfirm: () => {},
  });

  const toggleReservation = (e) => {
    e.stopPropagation();
    const isReserved = room.is_reserved;
    const roomNumStr = formatRoomNumber(room.room_number);
    setConfirmDialog({
      isOpen: true,
      type: isReserved ? 'info' : 'warning',
      title: `${isReserved ? 'Unreserve' : 'Reserve'} Room ${roomNumStr}?`,
      message: `Are you sure you want to ${isReserved ? 'unreserve' : 'reserve'} Room ${roomNumStr}?`,
      details: isReserved
        ? ['Room will become visible to students', 'Students can book this room']
        : ['Room will be hidden from students', 'No new bookings will be allowed'],
      confirmLabel: isReserved ? 'Unreserve Room' : 'Reserve Room',
      onConfirm: async () => {
        try {
          await api.put(`/admin/rooms/${room.room_id}/reserve`, {
            is_reserved: !isReserved
          });
          toast.success(`Room ${roomNumStr} ${isReserved ? 'unreserved' : 'reserved'}`);
          if (onRefresh) onRefresh();
        } catch (err) {
          toast.error('Failed to toggle reservation');
        } finally {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const deleteRoom = (e) => {
    e.stopPropagation();
    const roomNumStr = formatRoomNumber(room.room_number);
    setConfirmDialog({
      isOpen: true,
      type: 'danger',
      title: `Delete Room ${roomNumStr}?`,
      message: `Are you sure you want to permanently delete Room ${roomNumStr}?`,
      details: [
        '⚠️ This action CANNOT be undone',
        `Room ${roomNumStr} will be permanently removed`,
        'All student bookings in this room will be deleted',
        'Students assigned to this room will be reset to "Pending"',
        'The room will be freed from the system',
      ],
      confirmLabel: 'Delete Room',
      onConfirm: async () => {
        try {
          await api.delete(`/admin/rooms/${room.room_id}`);
          toast.success(`Room ${roomNumStr} deleted successfully.`);
          if (onRefresh) onRefresh();
        } catch (err) {
          toast.error(err.response?.data?.error || 'Failed to delete room');
        } finally {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const statusColors = {
    'Vacant': 'border-emerald-200 hover:border-emerald-300',
    'Pending_Pairing': 'border-amber-200 hover:border-amber-300',
    'Locked': 'border-blue-200 hover:border-blue-300',
  };

  const statusDots = {
    'Vacant': 'bg-emerald-500',
    'Pending_Pairing': 'bg-amber-500',
    'Locked': 'bg-blue-500',
  };

  const isReserved = room.is_reserved;
  const dotColor = isReserved ? 'bg-rose-500' : statusDots[room.status] || 'bg-slate-400';
  const borderColor = isReserved ? 'border-rose-200 hover:border-rose-300' : statusColors[room.status] || 'border-slate-200';

  const currentOccupancy = room.current_occupancy || (room.Students ? room.Students.length : 0);
  const capacity = room.capacity || 2;

  return (
    <>
      <div
        className={`relative bg-white border-2 rounded-2xl p-4 shadow-sm transition cursor-pointer flex flex-col justify-between min-h-[140px] ${borderColor} ${isHovered ? 'shadow-md scale-[1.01]' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => onClick(room.room_id)}
      >
        <div>
          {/* Checkbox + Room Number */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); onToggleSelect(room.room_id); }}
                className="text-slate-400 hover:text-blue-600 transition"
              >
                {isSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-slate-300" />}
              </button>
              <span className="text-lg font-extrabold text-slate-900">{formatRoomNumber(room.room_number)}</span>
            </div>

            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
              isReserved
                ? 'bg-rose-100 text-rose-700 border-rose-200'
                : room.status === 'Vacant' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                  room.status === 'Pending_Pairing' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                  room.status === 'Locked' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                  'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              {isReserved ? '🔴 Reserved' : room.status?.replace('_', ' ') || 'Unknown'}
            </span>
          </div>

          {/* Occupancy */}
          <div className="mt-2.5 flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`}></span>
            <span className="text-xs font-bold text-slate-700">
              {currentOccupancy}/{capacity} Occupied
            </span>
            {room.capacity === 1 && (
              <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                Single
              </span>
            )}
            {room.capacity === 2 && (
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                Double
              </span>
            )}
            {room.capacity === 3 && (
              <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                Triple
              </span>
            )}
          </div>

          {/* Status Indicator for Pending */}
          {room.status === 'Pending_Pairing' && (
            <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-amber-600">
              <Clock className="w-3 h-3" /> Waiting for roommates
            </div>
          )}
        </div>

        {/* Hover Actions */}
        {isHovered && (
          <div className="mt-2 flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
            <button
              onClick={(e) => { e.stopPropagation(); setManageModalOpen(true); }}
              className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition font-semibold"
              title="Manage Room Occupants"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={toggleReservation}
              className="p-1.5 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition"
              title={room.is_reserved ? 'Unreserve' : 'Reserve'}
            >
              {room.is_reserved ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={deleteRoom}
              className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
              title="Delete Room"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {manageModalOpen && (
        <ManageRoomModal
          roomId={room?.room_id || room?.roomId || room?.id}
          onClose={() => setManageModalOpen(false)}
          onRefresh={onRefresh}
        />
      )}

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

export default RoomCard;
