// frontend/src/components/Student/SwapStepTargetRoom.jsx

import React from 'react';
import { Home, Info, ArrowRight } from 'lucide-react';

const SwapStepTargetRoom = ({
  eligibleRooms,
  targetRoomId,
  onSelectRoom,
  onNext,
  sourceRoom,
  roomCapacity
}) => {
  const selectedRoom = eligibleRooms.find(r => String(r.room_id) === String(targetRoomId));

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
          <Home className="w-4 h-4 text-amber-500" />
          Step 1: Select Target Room
        </h4>
        <p className="text-xs text-slate-500 mt-1">
          Choose a room in your hostel to initiate a swap request with.
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-700">
          Available Target Rooms ({eligibleRooms.length} Eligible)
        </label>
        <select
          value={targetRoomId}
          onChange={(e) => onSelectRoom(e.target.value)}
          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
        >
          <option value="" disabled>-- Select a target room --</option>
          {eligibleRooms.map(r => (
            <option key={r.room_id} value={r.room_id}>
              Room {r.room_number} ({r.Floor?.Block?.name || 'Block'}, Floor {r.Floor?.floor_number ?? '-'}) &bull; Fully Occupied ({r.current_occupancy}/{r.capacity})
            </option>
          ))}
        </select>
      </div>

      {selectedRoom && (
        <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1 text-xs">
          <div className="font-bold text-amber-900 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            Selected Target Room Details
          </div>
          <p className="text-amber-800">
            Room <strong>{selectedRoom.room_number}</strong> ({selectedRoom.Floor?.Block?.name}, Floor {selectedRoom.Floor?.floor_number}) &bull; Current Occupants: {selectedRoom.Students?.map(s => s.full_name).join(', ') || 'N/A'}
          </p>
        </div>
      )}

      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 flex items-center gap-2">
        <Info className="w-4 h-4 text-slate-400 shrink-0" />
        <span>Only fully occupied {roomCapacity}-seater rooms in your hostel that are not in an active swap are shown.</span>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onNext}
          disabled={!targetRoomId}
          className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next: Choose Swap Type <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default SwapStepTargetRoom;
