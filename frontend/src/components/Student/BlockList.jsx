import React from 'react';
import BlockPill from './BlockPill';

const BlockList = ({ blocks = [], onSelect, selectedBlock, hostelName = 'Hostel' }) => {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
      <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
        🏠 {hostelName} → Select Block
      </h2>
      <div className="flex flex-wrap gap-3">
        {blocks.map((b) => (
          <BlockPill
            key={b.block_id}
            block={b}
            onSelect={onSelect}
            isSelected={String(selectedBlock) === String(b.block_id)}
          />
        ))}
      </div>
    </div>
  );
};

export default BlockList;