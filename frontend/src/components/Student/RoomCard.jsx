import React from 'react';

const RoomCard = ({ room, onSelect, onJoinPending }) => {
  const statusConfig = {
    'Vacant': {
      bg: 'bg-green-50',
      border: 'border-green-300',
      hover: 'hover:border-green-500 hover:shadow-md',
      text: 'text-green-700',
      cursor: 'cursor-pointer',
      label: 'Vacant',
    },
    'Pending_Pairing': {
      bg: 'bg-yellow-50',
      border: 'border-yellow-300',
      hover: 'hover:border-yellow-500 hover:shadow-md',
      text: 'text-yellow-700',
      cursor: 'cursor-pointer',
      label: 'Pending',
    },
    'Pending': {
      bg: 'bg-yellow-50',
      border: 'border-yellow-300',
      hover: 'hover:border-yellow-500 hover:shadow-md',
      text: 'text-yellow-700',
      cursor: 'cursor-pointer',
      label: 'Pending',
    },
    'Locked': {
      bg: 'bg-red-50',
      border: 'border-red-300',
      hover: '',
      text: 'text-red-400',
      cursor: 'cursor-not-allowed',
      label: 'Full',
    },
    'Full': {
      bg: 'bg-red-50',
      border: 'border-red-300',
      hover: '',
      text: 'text-red-400',
      cursor: 'cursor-not-allowed',
      label: 'Full',
    },
  };

  const config = statusConfig[room.status] || statusConfig['Locked'];

  const handleRoomClick = () => {
    // Vacant room → Book
    if (room.status === 'Vacant' && onSelect) {
      onSelect(room);
    }
    // Pending room → Open code modal
    else if ((room.status === 'Pending_Pairing' || room.status === 'Pending') && onJoinPending) {
      onJoinPending(room);
    }
  };

  const isPending = room.status === 'Pending_Pairing' || room.status === 'Pending';
  const isVacant = room.status === 'Vacant';
  const statusClassName = isPending ? 'pending-pairing' : isVacant ? 'vacant' : 'full';

  return (
    <div
      onClick={handleRoomClick}
      className={`room-card ${statusClassName} relative p-4 rounded-xl border-2 ${config.bg} ${config.border} ${config.hover} ${config.cursor} transition-all select-none`}
    >
      <div className={`text-lg font-bold ${config.text}`}>
        {room.room_number}
      </div>
      <div className="text-xs text-gray-500 mt-1 font-medium">
        {config.label}
        {room.current_occupancy > 0 && ` (${room.current_occupancy}/${room.capacity})`}
      </div>
    </div>
  );
};

export default RoomCard;