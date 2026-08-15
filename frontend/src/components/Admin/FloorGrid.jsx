import React from 'react';
import FloorCard from './FloorCard';
import { Plus } from 'lucide-react';

const FloorGrid = ({ floors = [], nextFloorNumber, hostelId, blockId, onAddFloor, onFloorClick, onRefresh }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {/* Existing floors */}
      {floors.map((floor) => (
        <FloorCard
          key={floor.floor_id}
          floor={floor}
          hostelId={hostelId}
          blockId={blockId}
          onClick={onFloorClick}
          onRefresh={onRefresh}
        />
      ))}

      {/* Single "Add Floor X" card */}
      {nextFloorNumber !== null && nextFloorNumber !== undefined && (
        <div 
          onClick={() => onAddFloor(nextFloorNumber)}
          className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-5 text-center transition hover:bg-slate-100 hover:border-blue-400 cursor-pointer flex flex-col items-center justify-center min-h-[180px] space-y-2 group shadow-sm"
        >
          <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center group-hover:scale-110 transition">
            <Plus className="w-6 h-6" />
          </div>
          <div className="text-sm font-bold text-slate-800">Add Floor {nextFloorNumber}</div>
          <div className="text-xs text-slate-400 font-medium">Click to create immediately</div>
        </div>
      )}
    </div>
  );
};

export default FloorGrid;
