import React from 'react';
import RoomCard from './RoomCard';

const RoomGridContainer = ({
  rooms,
  loading,
  selectedRooms,
  onToggleSelect,
  onRoomClick,
  onRefresh
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm animate-pulse h-32"></div>
        ))}
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <p className="text-base font-bold text-slate-700">No rooms found on this floor.</p>
        <p className="text-xs text-slate-400 mt-1">Add rooms using the range form above or adjust search filters.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {rooms.map((room) => (
        <RoomCard
          key={room.room_id}
          room={room}
          isSelected={selectedRooms.includes(room.room_id)}
          onToggleSelect={onToggleSelect}
          onClick={onRoomClick}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  );
};

export default RoomGridContainer;
