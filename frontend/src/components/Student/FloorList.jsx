import React from 'react';
import FloorTile from './FloorTile';

const FloorList = ({ floors = [], onSelect, selectedFloor, hostelName = 'Hostel', blockName = 'Block' }) => {
  if (!floors || floors.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
      <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
        🏠 {hostelName} → {blockName} → Select Floor
      </h2>
      <div className="grid grid-cols-6 gap-3 max-w-md">
        {floors.map((f) => (
          <FloorTile
            key={f.floor_id}
            floor={f}
            onSelect={onSelect}
            isAvailable={!f.is_reserved}
            isSelected={String(selectedFloor) === String(f.floor_id)}
          />
        ))}
      </div>
    </div>
  );
};

export default FloorList;