import React from 'react';
import PropTypes from 'prop-types';

const RoomCard = React.memo(({ room, onSelect, onJoinPending }) => {
  const statusConfig = {
    'Vacant': { bg: 'bg-green-50', border: 'border-green-300', hover: 'hover:border-green-500 hover:shadow-md', text: 'text-green-700', cursor: 'cursor-pointer' },
    'Pending_Pairing': { bg: 'bg-yellow-50', border: 'border-yellow-300', hover: 'hover:border-yellow-500 hover:shadow-md', text: 'text-yellow-700', cursor: 'cursor-pointer' },
    'Pending': { bg: 'bg-yellow-50', border: 'border-yellow-300', hover: 'hover:border-yellow-500 hover:shadow-md', text: 'text-yellow-700', cursor: 'cursor-pointer' },
    'Locked': { bg: 'bg-red-50', border: 'border-red-300', hover: '', text: 'text-red-400', cursor: 'cursor-not-allowed' },
  };

  const config = statusConfig[room.status] || statusConfig['Locked'];

  const handleRoomClick = () => {
    if (room.status === 'Vacant' && onSelect) {
      onSelect(room);
    } else if ((room.status === 'Pending_Pairing' || room.status === 'Pending') && onJoinPending) {
      onJoinPending(room);
    }
  };

  return (
    <div
      onClick={handleRoomClick}
      className={`relative rounded-xl border-2 h-20 flex items-center justify-center text-lg font-bold transition ${config.bg} ${config.border} ${config.text} ${config.hover} ${config.cursor}`}
    >
      {room.room_number}
      {(room.status === 'Pending_Pairing' || room.status === 'Pending') && (
        <span className="absolute top-1 right-1 text-[10px] bg-yellow-200 text-yellow-800 font-semibold px-1.5 py-0.5 rounded-full">
          Waiting
        </span>
      )}
    </div>
  );
});

RoomCard.propTypes = {
  room: PropTypes.object.isRequired,
  onSelect: PropTypes.func,
  onJoinPending: PropTypes.func,
};

export default RoomCard;