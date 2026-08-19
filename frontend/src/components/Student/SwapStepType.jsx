// frontend/src/components/Student/SwapStepType.jsx

import React from 'react';
import { User, Users, UserCheck, ArrowRight, ArrowLeft } from 'lucide-react';

const SwapStepType = ({
  swapType,
  onSelectType,
  onNext,
  onBack,
  roomCapacity
}) => {
  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
          <User className="w-4 h-4 text-amber-500" />
          Step 2: Choose Swap Type
        </h4>
        <p className="text-xs text-slate-500 mt-1">
          Select how many students will exchange rooms.
        </p>
      </div>

      <div className={`grid gap-3 ${roomCapacity === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {/* Single Swap Card */}
        <div
          onClick={() => onSelectType('single')}
          className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col items-center text-center space-y-2 ${
            swapType === 'single'
              ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-500/20 shadow-sm'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            🔄 1↔1
          </div>
          <div>
            <h5 className="text-xs font-bold text-slate-900">Single Swap</h5>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Swap 1 student from your room with 1 student from target room.
            </p>
          </div>
          <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
            2 Consents Required
          </span>
        </div>

        {/* Double Swap Card (only if capacity = 3) */}
        {roomCapacity === 3 && (
          <div
            onClick={() => onSelectType('double')}
            className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col items-center text-center space-y-2 ${
              swapType === 'double'
                ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-500/20 shadow-sm'
                : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              🔄 2↔2
            </div>
            <div>
              <h5 className="text-xs font-bold text-slate-900">Double Swap</h5>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Swap 2 students from your room with 2 students from target room.
              </p>
            </div>
            <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
              4 Consents Required
            </span>
          </div>
        )}

        {/* Full Swap Card */}
        <div
          onClick={() => onSelectType('full')}
          className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col items-center text-center space-y-2 ${
            swapType === 'full'
              ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-500/20 shadow-sm'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            🔄 {roomCapacity}↔{roomCapacity}
          </div>
          <div>
            <h5 className="text-xs font-bold text-slate-900">Full Swap</h5>
            <p className="text-[11px] text-slate-500 mt-0.5">
              All occupants in both rooms swap places completely.
            </p>
          </div>
          <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
            {roomCapacity * 2} Consents Required
          </span>
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-sm"
        >
          {swapType === 'full' ? 'Next: Review Summary' : 'Next: Select Movers'} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default SwapStepType;
