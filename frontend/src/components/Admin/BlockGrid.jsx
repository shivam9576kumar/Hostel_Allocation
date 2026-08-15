import React from 'react';
import BlockCard from './BlockCard';
import { Plus } from 'lucide-react';

const BlockGrid = ({ blocks = [], nextBlockName, hostelId, onAddBlock, onBlockUpdated, onViewFloors }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {/* Existing blocks */}
      {blocks.map((block) => (
        <BlockCard
          key={block.block_id}
          block={block}
          hostelId={hostelId}
          onBlockUpdated={onBlockUpdated}
          onViewFloors={onViewFloors}
        />
      ))}

      {/* Single "Add BLOCK X" card at the end */}
      {nextBlockName && (
        <div
          onClick={() => onAddBlock(nextBlockName)}
          className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center transition hover:bg-slate-100 hover:border-blue-400 cursor-pointer flex flex-col items-center justify-center min-h-[220px] space-y-2 group shadow-sm"
        >
          <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center group-hover:scale-110 transition">
            <Plus className="w-6 h-6" />
          </div>
          <div className="text-base font-bold text-slate-800">Add {nextBlockName}</div>
          <div className="text-xs text-slate-400 font-medium">Click to create immediately</div>
        </div>
      )}
    </div>
  );
};

export default BlockGrid;
