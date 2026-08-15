import React from 'react';

const FloorTile = ({ floor, onSelect, isAvailable = true, isSelected = false }) => {
  const available = isAvailable && !floor.is_reserved;
  return (
    <button
      onClick={() => available && onSelect && onSelect(floor.floor_id)}
      className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center text-xl font-bold transition ${
        isSelected
          ? 'border-blue-600 bg-blue-600 text-white shadow-md ring-2 ring-blue-500/30'
          : available
          ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-500 cursor-pointer'
          : 'border-red-200 bg-red-50 text-red-400 cursor-not-allowed'
      }`}
    >
      {floor.floor_number}
    </button>
  );
};

export default FloorTile;