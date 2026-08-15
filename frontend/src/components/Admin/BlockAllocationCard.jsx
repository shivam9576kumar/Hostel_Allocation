import React from 'react';
import { Layers, Eye, CheckCircle, AlertCircle, ShieldAlert } from 'lucide-react';

const BlockAllocationCard = ({ block, onClick }) => {
  let status = 'complete';
  if (block.hasConflict) status = 'conflict';
  else if (!block.hasRules) status = 'missing';

  const statusConfig = {
    complete: { bg: 'border-emerald-200 hover:border-emerald-300', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle, label: '✅ Complete' },
    conflict: { bg: 'border-rose-200 hover:border-rose-300', badge: 'bg-rose-100 text-rose-700 border-rose-200', icon: ShieldAlert, label: '⚠️ Conflict' },
    missing: { bg: 'border-amber-200 hover:border-amber-300', badge: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertCircle, label: '⚠️ Missing' },
  };

  const config = statusConfig[status] || statusConfig.missing;
  const StatusIcon = config.icon;

  return (
    <div
      onClick={() => onClick(block.block_id)}
      className={`bg-white border-2 rounded-2xl p-6 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between ${config.bg}`}
    >
      <div>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-extrabold text-slate-900">{block.name}</h3>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 ${config.badge}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            {config.label}
          </span>
        </div>

        <div className="mt-4 text-xs font-semibold text-slate-500 space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div>Rules Configured: <span className="font-extrabold text-slate-800">{block.ruleCount}</span></div>
          {block.hasRules && (
            <div>
              <span className="font-bold text-slate-700 block mb-1">Eligible Programmes:</span>
              <div className="flex flex-wrap gap-1">
                {block.programmes.map((p) => (
                  <span key={p} className="bg-white border border-slate-200 px-2 py-0.5 rounded-md text-[11px] font-bold text-slate-800">{p}</span>
                ))}
              </div>
            </div>
          )}
          {block.hasConflict && (
            <div className="text-rose-600 font-bold pt-1 border-t border-slate-200/60">
              ⚠️ Overlapping floor ranges detected
            </div>
          )}
          {!block.hasRules && (
            <div className="text-amber-600 font-bold pt-1 border-t border-slate-200/60">
              No rules assigned to this block
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
        <span className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
          View Floor Rules <Eye className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
};

export default BlockAllocationCard;
