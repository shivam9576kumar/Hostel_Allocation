import React from 'react';
import { ArrowLeftRight } from 'lucide-react';

const SwapButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="py-2.5 px-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-slate-950 font-bold rounded-xl shadow-md transition flex items-center gap-2 text-sm"
    >
      <ArrowLeftRight className="w-4 h-4" />
      Request Room Swap
    </button>
  );
};

export default SwapButton;
