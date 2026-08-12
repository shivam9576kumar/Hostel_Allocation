import React from 'react';
import { Clock, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

const SwapStatusBadge = ({ status }) => {
  switch (status) {
    case 'Executed':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle className="w-3.5 h-3.5" />
          Executed
        </span>
      );
    case 'Consenting':
    case 'Pending':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          Awaiting Consents
        </span>
      );
    case 'Cancelled':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
          <XCircle className="w-3.5 h-3.5" />
          Cancelled
        </span>
      );
    case 'Expired':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
          <Clock className="w-3.5 h-3.5" />
          Expired
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
          <AlertCircle className="w-3.5 h-3.5" />
          {status}
        </span>
      );
  }
};

export default SwapStatusBadge;
