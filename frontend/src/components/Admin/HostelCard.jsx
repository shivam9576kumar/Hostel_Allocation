import React from 'react';
import { Building2, Eye, ShieldCheck, PlusCircle } from 'lucide-react';

const HostelCard = ({ hostel, onClick }) => {
  const hasRules = hostel.rules > 0;

  return (
    <div
      onClick={() => onClick(hostel.hostel_id)}
      className="bg-white border-2 border-slate-200 hover:border-blue-300 rounded-2xl p-6 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between"
    >
      <div>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-extrabold text-slate-900">🏠 {hostel.name}</h3>
          </div>
        </div>

        <div className="mt-4 text-xs font-semibold text-slate-500 space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div>Blocks: <span className="font-bold text-slate-800">{hostel.blocks}</span></div>
          <div>Rules: <span className="font-bold text-slate-800">{hostel.rules}</span></div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
        <button
          onClick={(e) => { e.stopPropagation(); onClick(hostel.hostel_id); }}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm ${
            hasRules
              ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          {hasRules ? <ShieldCheck className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
          {hasRules ? '[ Update Rules ]' : '[ Set Rules ]'}
        </button>
      </div>
    </div>
  );
};

export default HostelCard;
