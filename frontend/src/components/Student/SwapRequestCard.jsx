import React, { useState } from 'react';
import { ArrowLeftRight, Check, X, Clock, Users, ShieldAlert } from 'lucide-react';
import { giveConsent, cancelRequest } from '../../api/swap';
import toast from 'react-hot-toast';

const SwapRequestCard = ({ request, currentUserRoll, onUpdate }) => {
  const [loading, setLoading] = useState(false);

  const consents = typeof request.consents === 'string' ? JSON.parse(request.consents) : (request.consents || {});
  const total = Object.keys(consents).length;
  const consented = Object.values(consents).filter(v => v === true).length;
  const progress = total > 0 ? (consented / total) * 100 : 0;

  const myConsent = consents[currentUserRoll];
  const isInitiator = request.initiator_roll === currentUserRoll;
  const isFinished = ['Executed', 'Cancelled', 'Expired'].includes(request.status);
  const canAct = !isFinished && myConsent !== true && request.status !== 'Cancelled';

  const handleAccept = async () => {
    setLoading(true);
    try {
      await giveConsent(request.id, true);
      toast.success('You have consented to the room swap.');
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to consent');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!window.confirm('Reject this swap request?')) return;
    setLoading(true);
    try {
      await giveConsent(request.id, false);
      toast.error('You have rejected the swap request.');
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel this swap request?')) return;
    setLoading(true);
    try {
      await cancelRequest(request.id);
      toast.info('Swap request cancelled.');
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition space-y-3">
      {/* Card Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">Request #{request.id}</span>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
            request.status === 'Executed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
            request.status === 'Cancelled' ? 'bg-rose-50 text-rose-700 border-rose-200' :
            request.status === 'Expired' ? 'bg-slate-50 text-slate-700 border-slate-200' :
            'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {request.status}
          </span>
        </div>
        {request.expires_at && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Expires: {new Date(request.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        )}
      </div>

      {/* Room Interchange Heading */}
      <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
        <span>Room {request.SourceRoom?.room_number || request.source_room_id}</span>
        <ArrowLeftRight className="w-4 h-4 text-amber-500 shrink-0" />
        <span>Room {request.TargetRoom?.room_number || request.target_room_id}</span>
        <span className="text-xs font-semibold text-slate-500 ml-1">({request.swap_type || 'swap'})</span>
      </div>

      {/* Consent Progress Bar */}
      <div>
        <div className="flex justify-between text-xs text-slate-600 mb-1 font-medium">
          <span>Consent Collection Progress ({consented}/{total})</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Participants Consent Roster */}
      <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
        {Object.entries(consents).map(([roll, status]) => {
          const isSelf = roll === currentUserRoll;
          const isConsented = status === true;
          const isRejected = status === false;

          return (
            <div key={roll} className="flex items-center justify-between text-xs py-0.5">
              <span className="font-mono font-semibold text-slate-800">
                {roll} {isSelf && <span className="text-blue-600 font-bold">(You)</span>}
              </span>
              <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold flex items-center gap-1 ${
                isConsented ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                isRejected ? 'bg-rose-100 text-rose-800 border-rose-200' :
                'bg-amber-100 text-amber-800 border-amber-200'
              }`}>
                {isConsented ? <Check className="w-3 h-3 text-emerald-600" /> :
                 isRejected ? <X className="w-3 h-3 text-rose-600" /> :
                 <Clock className="w-3 h-3 text-amber-600" />}
                {isConsented ? 'Consented' : isRejected ? 'Rejected' : 'Pending'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
        {canAct && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleAccept}
              disabled={loading}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" /> Accept & Consent
            </button>
            <button
              onClick={handleReject}
              disabled={loading}
              className="px-4 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" /> Reject
            </button>
          </div>
        )}

        {isInitiator && !isFinished && (
          <button
            onClick={handleCancel}
            disabled={loading}
            className="ml-auto px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition disabled:opacity-50"
          >
            Cancel Request
          </button>
        )}

        {request.status === 'Executed' && (
          <div className="text-xs text-emerald-700 font-bold flex items-center gap-1">
            <Check className="w-4 h-4 text-emerald-600" /> Room swap executed successfully!
          </div>
        )}
      </div>
    </div>
  );
};

export default SwapRequestCard;
