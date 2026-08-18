import React from 'react';

const RoomGrid = React.memo(({ rooms = [], onSelectRoom }) => {
  if (!rooms || rooms.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-600">No Available Rooms Found</h3>
        <p className="text-xs text-slate-400 mt-1">Select a floor from above to view the room grid.</p>
      </div>
    );
  }

  // Filter out reserved rooms
  const visibleRooms = rooms.filter(r => !r.is_reserved);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          Floor Room Availability Grid
        </h2>
        <span className="text-xs text-slate-400 font-medium">Click a vacant green room to book</span>
      </div>

      {/* Grid Display - 5 columns minimal layout */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {visibleRooms.map((room) => {
          const isVacant = room.status === 'Vacant';
          const isPending = room.status === 'Pending_Pairing';
          const isLocked = room.status === 'Locked';

          let bgColor = 'bg-slate-50';
          let textColor = 'text-slate-600';
          let borderColor = 'border-slate-200';
          let hoverClass = '';
          let disabledClass = 'cursor-default';

          if (isVacant) {
            bgColor = 'bg-green-50';
            textColor = 'text-green-800';
            borderColor = 'border-green-300';
            hoverClass = 'hover:border-green-500 hover:shadow-md';
            disabledClass = 'cursor-pointer';
          } else if (isPending) {
            bgColor = 'bg-yellow-50';
            textColor = 'text-yellow-800';
            borderColor = 'border-yellow-300';
            disabledClass = 'cursor-not-allowed';
          } else if (isLocked) {
            bgColor = 'bg-red-50';
            textColor = 'text-red-800';
            borderColor = 'border-red-300';
            disabledClass = 'cursor-not-allowed';
          }

          return (
            <div
              key={room.room_id}
              onClick={() => isVacant && onSelectRoom && onSelectRoom(room)}
              className={`relative flex items-center justify-center h-20 rounded-xl border-2 ${bgColor} ${borderColor} ${textColor} font-bold text-lg ${hoverClass} ${disabledClass} transition select-none`}
            >
              {room.room_number}

              {/* Waiting Badge for Pending Rooms */}
              {isPending && (
                <span className="absolute top-1.5 right-1.5 text-[10px] bg-yellow-200 text-yellow-900 font-semibold px-1.5 py-0.5 rounded-full">
                  Waiting
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Status Legend */}
      <div className="pt-2 text-xs text-slate-400 font-medium flex items-center gap-6">
        <span className="flex items-center gap-1.5">🟢 Vacant</span>
        <span className="flex items-center gap-1.5">🟡 Pending</span>
        <span className="flex items-center gap-1.5">🔴 Full</span>
      </div>
    </div>
  );
});

export default RoomGrid;
