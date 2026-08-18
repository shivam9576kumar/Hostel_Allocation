import React from 'react';

const BlockPill = React.memo(({ block, onSelect, isSelected }) => {
  const isOpen = block.is_reserved !== true && block.status !== 'full';
  return (
    <button
      onClick={() => isOpen && onSelect && onSelect(block.block_id)}
      className={`rounded-full px-6 py-2 border-2 font-medium transition ${
        isSelected
          ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
          : isOpen
          ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
          : 'border-red-200 bg-red-50 text-red-400 cursor-not-allowed'
      }`}
    >
      {block.name} {isOpen ? '✅' : '🔴'}
    </button>
  );
});

export default BlockPill;