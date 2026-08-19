// frontend/src/components/Student/SwapStepSummary.jsx

import React from 'react';
import { ArrowLeftRight, CheckCircle2, Info, ArrowLeft, Loader2 } from 'lucide-react';

const SwapStepSummary = ({
  summary,
  sourceRoom,
  selectedRoom,
  currentUserRoll,
  swapType,
  loading,
  onSubmit,
  onBack,
  onCancel
}) => {
  if (!summary || !selectedRoom) return null;

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
          <ArrowLeftRight className="w-4 h-4 text-amber-500" />
          Step 4: Review & Confirm
        </h4>
        <p className="text-xs text-slate-500 mt-1">
          Review the room swap details before submitting your request.
        </p>
      </div>

      {/* Summary Box */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-3.5">
        <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
          <div className="font-extrabold text-amber-900 text-xs flex items-center gap-1.5 uppercase">
            <Info className="w-4 h-4 text-amber-700 shrink-0" />
            Swap Summary ({swapType.toUpperCase()} SWAP)
          </div>
          <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
            {summary.consentsRequired} Consents Required
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Source Movers */}
          <div className="bg-white p-3 rounded-xl border border-amber-200/60 shadow-2xs space-y-1">
            <span className="font-extrabold text-slate-900 block text-[11px] uppercase tracking-wider text-amber-800">
              Moving to Room {selectedRoom.room_number}:
            </span>
            {summary.sourceMoversList.map(s => (
              <div key={s.roll_number} className="text-slate-800 font-semibold text-xs flex items-center justify-between">
                <span>&bull; {s.full_name || s.roll_number}</span>
                <span className="text-[10px] text-slate-400 font-mono">({s.roll_number})</span>
              </div>
            ))}
          </div>

          {/* Target Movers */}
          <div className="bg-white p-3 rounded-xl border border-amber-200/60 shadow-2xs space-y-1">
            <span className="font-extrabold text-slate-900 block text-[11px] uppercase tracking-wider text-amber-800">
              Moving to Room {sourceRoom?.room_number || 'Your Room'}:
            </span>
            {summary.targetMoversList.map(s => (
              <div key={s.roll_number} className="text-slate-800 font-semibold text-xs flex items-center justify-between">
                <span>&bull; {s.full_name || s.roll_number}</span>
                <span className="text-[10px] text-slate-400 font-mono">({s.roll_number})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Notices */}
        <div className="space-y-1.5 pt-2 border-t border-amber-200/60 text-[11px] text-amber-900 font-medium">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>All affected moving students will be asked for digital consent before execution.</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>Allocation PDFs and certificates will be automatically regenerated after swap execution.</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5 disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-extrabold rounded-xl text-xs transition shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeftRight className="w-4 h-4" />}
            Request Swap
          </button>
        </div>
      </div>
    </div>
  );
};

export default SwapStepSummary;
