import React from 'react';
import { Building2 } from 'lucide-react';

const BlockSelector = ({ blocks = [], selectedBlock, onSelect, loading }) => {
  return (
    <div className="flex items-center gap-3">
      <Building2 className="w-5 h-5 text-slate-400" />
      <select
        value={selectedBlock?.block_id || ''}
        onChange={(e) => {
          const block = blocks.find(b => b.block_id === parseInt(e.target.value, 10));
          onSelect(block || null);
        }}
        className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium min-w-[200px]"
        disabled={loading || blocks.length === 0}
      >
        <option value="">Select Block</option>
        {blocks.map((block) => (
          <option key={block.block_id} value={block.block_id}>
            {block.name}
          </option>
        ))}
      </select>
      {loading && <span className="text-xs text-slate-400 animate-pulse">Loading...</span>}
    </div>
  );
};

export default BlockSelector;
