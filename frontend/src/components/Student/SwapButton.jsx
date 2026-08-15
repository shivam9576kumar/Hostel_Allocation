import React from 'react';
import { ArrowLeftRight } from 'lucide-react';

const SwapButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-sm shadow-amber-600/20"
    >
      <ArrowLeftRight className="w-4 h-4" />
      Swap Room
    </button>
  );
};

export default SwapButton;
