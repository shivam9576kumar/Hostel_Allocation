import React from 'react';
import { DoorClosed, User, Users, Lock, Clock } from 'lucide-react';

const RoomGrid = ({ rooms = [], onSelectRoom }) => {
  if (!rooms || rooms.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
        <DoorClosed className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-700">No Available Rooms Found</h3>
        <p className="text-sm text-slate-500 mt-1">Select a floor from the cascading dropdown above to view room grid.</p>
      </div>
    );
  }

  // Filter out reserved rooms
  const visibleRooms = rooms.filter(r => !r.is_reserved);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <DoorClosed className="w-5 h-5 text-blue-600" />
            Floor Room Availability Grid
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Click a vacant green room to initiate booking and receive your pairing code.</p>
        </div>

        {/* Status Legend */}
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-600"></span>
            <span className="text-slate-700">Vacant (Clickable)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 border border-amber-600"></span>
            <span className="text-slate-700">Pending Pairing</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 border border-rose-600"></span>
            <span className="text-slate-700">Locked / Fully Occupied</span>
          </div>
        </div>
      </div>

      {/* Grid Display */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {visibleRooms.map((room) => {
          const isVacant = room.status === 'Vacant';
          const isPending = room.status === 'Pending_Pairing';
          const isLocked = room.status === 'Locked';

          let cardStyle = 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed';
          let badgeStyle = 'bg-slate-200 text-slate-700';

          if (isVacant) {
            cardStyle = 'border-emerald-300 bg-emerald-50/80 hover:bg-emerald-100/90 text-emerald-950 hover:border-emerald-500 cursor-pointer shadow-sm hover:shadow-md transition';
            badgeStyle = 'bg-emerald-600 text-white';
          } else if (isPending) {
            cardStyle = 'border-amber-300 bg-amber-50 text-amber-950 hover:border-amber-400 cursor-pointer transition';
            badgeStyle = 'bg-amber-500 text-white';
          } else if (isLocked) {
            cardStyle = 'border-rose-200 bg-rose-50/60 text-rose-900 cursor-not-allowed opacity-85';
            badgeStyle = 'bg-rose-600 text-white';
          }

          return (
            <div
              key={room.room_id}
              onClick={() => onSelectRoom(room)}
              className={`rounded-2xl p-4 border flex flex-col items-center justify-between text-center min-h-[130px] relative ${cardStyle}`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <span className="font-bold text-base tracking-tight">{room.room_number}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${badgeStyle}`}>
                  {room.status.replace('_', ' ')}
                </span>
              </div>

              <div className="my-2">
                {isVacant && <DoorClosed className="w-8 h-8 text-emerald-600 mx-auto" />}
                {isPending && <Clock className="w-8 h-8 text-amber-600 mx-auto animate-pulse" />}
                {isLocked && <Lock className="w-8 h-8 text-rose-600 mx-auto" />}
              </div>

              <div className="flex items-center gap-1 text-xs font-medium text-slate-600">
                <Users className="w-3.5 h-3.5" />
                <span>{room.current_occupancy || (isPending ? 1 : 0)} / {room.capacity || 2} Occupied</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RoomGrid;
