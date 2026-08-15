import React from 'react';
import { Users, Lock, Unlock, Trash2, UserCog } from 'lucide-react';

const RoomTableRow = ({ 
  room, 
  selected, 
  onSelect, 
  onManage, 
  onReserve, 
  onDelete 
}) => {
  const floor = room.Floor;
  const block = floor?.Block;
  const hostel = block?.Hostel;
  const occupants = room.Students || [];
  const capacity = room.capacity || 3;
  const currentOccupancy = room.current_occupancy || occupants.length || 0;
  const occupancyPercent = (currentOccupancy / capacity) * 100;

  const statusColors = {
    'Vacant': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Pending_Pairing': 'bg-amber-100 text-amber-800 border-amber-200',
    'Locked': 'bg-blue-100 text-blue-800 border-blue-200',
  };

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/80 transition">
      {/* Checkbox */}
      <td className="p-3.5">
        <input 
          type="checkbox" 
          checked={selected} 
          onChange={onSelect}
          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300" 
        />
      </td>

      {/* Room ID & Number */}
      <td className="p-3.5">
        <div className="font-mono text-sm font-bold text-slate-900">
          Room {room.room_number}
        </div>
        <span className="text-[10px] text-slate-400 font-mono">ID: #{room.room_id}</span>
      </td>

      {/* Hierarchy */}
      <td className="p-3.5 text-xs font-semibold text-slate-600">
        {hostel?.name || 'Hostel'} / {block?.name || 'Block'} / Floor {floor?.floor_number ?? 0}
      </td>

      {/* Visual Occupancy Bar & Occupants Roster */}
      <td className="p-3.5">
        <div className="space-y-1.5 min-w-[180px]">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              Occupancy
            </span>
            <span className="font-mono">{currentOccupancy} / {capacity}</span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                occupancyPercent === 0 
                  ? 'bg-emerald-500' 
                  : occupancyPercent < 100 
                    ? 'bg-amber-500' 
                    : 'bg-blue-600'
              }`}
              style={{ width: `${occupancyPercent}%` }}
            />
          </div>

          {/* Occupants tags */}
          {occupants.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {occupants.map((st) => (
                <span
                  key={st.roll_number}
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                  title={`${st.full_name} (${st.roll_number})`}
                >
                  {st.full_name?.split(' ')[0]} ({st.roll_number})
                </span>
              ))}
            </div>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="p-3.5">
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase border ${statusColors[room.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
          {room.status?.replace('_', ' ') || 'Vacant'}
        </span>
      </td>

      {/* Reservation Status */}
      <td className="p-3.5">
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase inline-flex items-center gap-1 border ${
          room.is_reserved 
            ? 'bg-amber-100 text-amber-800 border-amber-300' 
            : 'bg-emerald-100 text-emerald-800 border-emerald-200'
        }`}>
          {room.is_reserved ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          {room.is_reserved ? 'Reserved (Hidden)' : 'Active (Visible)'}
        </span>
      </td>

      {/* Actions */}
      <td className="p-3.5 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {/* Manage Occupants Button */}
          {currentOccupancy > 0 && (
            <button
              onClick={onManage}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 rounded-lg text-xs font-bold transition inline-flex items-center gap-1 shadow-sm"
              title="Manage Occupants (Release individual or all students)"
            >
              <UserCog className="w-3.5 h-3.5" />
              Manage
            </button>
          )}

          {/* Reserve / Unreserve */}
          <button
            onClick={onReserve}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition border ${
              room.is_reserved 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
            }`}
            title={room.is_reserved ? 'Unreserve Room' : 'Mark Room Reserved'}
          >
            {room.is_reserved ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            {room.is_reserved ? 'Unreserve' : 'Reserve'}
          </button>

          {/* Delete Room */}
          <button
            onClick={onDelete}
            className="p-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition"
            title="Delete Room"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default RoomTableRow;
