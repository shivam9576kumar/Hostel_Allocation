// frontend/src/components/Student/SwapConfirmation.jsx

import React from 'react';
import { CheckCircle2, Clock, X, ArrowRight } from 'lucide-react';

const SwapConfirmation = ({ isOpen, onClose, onViewRequest, createdRequestData }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div>
          <h3 className="text-xl font-extrabold text-slate-900">
            Swap Request Created!
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Your room swap request has been registered successfully.
          </p>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Next Steps: Collecting Consents</span>
          </div>
          <p className="text-slate-600 text-[11px]">
            All moving students must log in to their dashboard and accept the request.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              if (onViewRequest) onViewRequest();
              onClose();
            }}
            className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
          >
            View Requests <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SwapConfirmation;
