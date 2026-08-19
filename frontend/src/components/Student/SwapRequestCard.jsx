// frontend/src/components/Student/SwapRequestCard.jsx

import React, { useState } from 'react';
import { ArrowLeftRight, Check, X, Clock, Users, Loader2, ShieldCheck } from 'lucide-react';
import { giveConsent, cancelRequest } from '../../api/swap';
import ConfirmDialog from '../Common/ConfirmDialog';
import toast from 'react-hot-toast';

const SwapRequestCard = ({ request, currentUserRoll, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: 'danger',
    title: '',
    message: '',
    details: [],
    confirmLabel: 'Confirm',
    onConfirm: () => {},
  });

  const consents = typeof request.consents === 'string' ? JSON.parse(request.consents) : (request.consents || {});
  const myConsent = consents[currentUserRoll];
  const isInitiator = request.initiator_roll === currentUserRoll;
  const isFinished = ['Executed', 'Cancelled', 'Expired'].includes(request.status);
  const canAct = !isFinished && myConsent !== true && request.status !== 'Cancelled';

  const handleAccept = async () => {
    setLoading(true);
    try {
      await giveConsent(request.id, true);
      toast.success('You have consented to the room swap request.');
      if (onUpdate) await onUpdate();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to consent');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = () => {
    if (isFinished) {
      toast.info('This swap request is already finished.');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      type: 'danger',
      title: 'Reject Swap Request?',
      message: 'Are you sure you want to reject this room swap request?',
      details: [
        'The swap request will be cancelled for all participating students',
        'Your refusal will be recorded',
        'Room assignments will remain unchanged',
        'This action cannot be undone',
      ],
      confirmLabel: 'Reject Request',
      onConfirm: async () => {
        setLoading(true);
        try {
          await giveConsent(request.id, false);
          toast.error('You have rejected the swap request.');
          if (onUpdate) await onUpdate();
        } catch (err) {
          toast.error(err.response?.data?.error || 'Failed to reject');
        } finally {
          setLoading(false);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleCancel = () => {
    if (isFinished) {
      toast.info('This swap request is already finished and cannot be cancelled.');
      return;
    }

    const isTarget = request.target_student_roll === currentUserRoll;

    let cancelMessage = '';
    let cancelDetails = [];

    if (isInitiator) {
      cancelMessage = `Are you sure you want to cancel your swap request?`;
      cancelDetails = [
        'The swap request will be removed',
        'Both rooms will remain with their current occupants',
        'All consents will be cleared',
        'This action cannot be undone',
      ];
    } else if (isTarget) {
      cancelMessage = `Are you sure you want to cancel this swap request?`;
      cancelDetails = [
        'The swap request will be removed',
        'Your consent will be withdrawn',
        'The initiator will be notified',
        'This action cannot be undone',
      ];
    } else {
      cancelMessage = `Are you sure you want to cancel this swap request?`;
      cancelDetails = [
        'The swap request will be removed',
        'All consents will be cleared',
        'This action cannot be undone',
      ];
    }

    setConfirmDialog({
      isOpen: true,
      type: 'danger',
      title: 'Cancel Swap Request?',
      message: cancelMessage,
      details: cancelDetails,
      confirmLabel: 'Cancel Request',
      onConfirm: async () => {
        setLoading(true);
        try {
          await cancelRequest(request.id);
          toast.info('Swap request cancelled.');
          if (onUpdate) {
            await onUpdate();
          }
        } catch (err) {
          toast.error(err.response?.data?.error || 'Failed to cancel request');
        } finally {
          setLoading(false);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const initiatorName = request.Initiator?.full_name || request.initiator_roll;
  const targetStudentName = request.TargetStudent?.full_name || request.target_student_roll;

  // Helper to resolve student name from request object
  const getStudentName = (roll) => {
    if (roll === request.initiator_roll) return request.Initiator?.full_name || roll;
    if (roll === request.target_student_roll) return request.TargetStudent?.full_name || roll;
    return roll;
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition space-y-4">
        {/* Card Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">Request #{request.id}</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
              request.status === 'Executed' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
              request.status === 'Cancelled' ? 'bg-rose-100 text-rose-800 border-rose-300' :
              request.status === 'Expired' ? 'bg-slate-100 text-slate-700 border-slate-300' :
              'bg-amber-100 text-amber-900 border-amber-300'
            }`}>
              {request.status === 'Consenting' ? 'Awaiting Consents' : request.status}
            </span>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
            {request.swap_type?.toUpperCase()} SWAP
          </span>
        </div>

        {/* Room Interchange & Participants */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">From Room</span>
            <p className="text-sm font-extrabold text-slate-900">
              Room {request.SourceRoom?.room_number || request.source_room_id}
            </p>
            <p className="text-xs text-slate-500">Initiator: {initiatorName}</p>
          </div>

          <div className="p-2 bg-amber-100 text-amber-700 rounded-xl shrink-0 self-center">
            <ArrowLeftRight className="w-5 h-5" />
          </div>

          <div className="sm:text-right">
            <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">To Room</span>
            <p className="text-sm font-extrabold text-slate-900">
              Room {request.TargetRoom?.room_number || request.target_room_id}
            </p>
            {targetStudentName && <p className="text-xs text-slate-500">Target: {targetStudentName}</p>}
          </div>
        </div>

        {/* Participant Consent Cards with Full Student Names */}
        <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
          <div className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
            Participant Consents
          </div>
          {Object.entries(consents).map(([roll, status]) => {
            const isSelf = roll === currentUserRoll;
            let statusText = '⏳ Pending';
            let bgColor = 'bg-amber-100 text-amber-800 border-amber-200';
            let icon = <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />;

            if (status === true) {
              statusText = 'Consented ✅';
              bgColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
              icon = <Check className="w-3.5 h-3.5 text-emerald-600" />;
            } else if (status === false) {
              statusText = 'Rejected ❌';
              bgColor = 'bg-rose-100 text-rose-800 border-rose-200';
              icon = <X className="w-3.5 h-3.5 text-rose-600" />;
            }

            const studentName = getStudentName(roll);

            return (
              <div key={roll} className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl bg-white border border-slate-100">
                <span className="font-medium text-slate-800">
                  {studentName}
                  {studentName !== roll && <span className="text-xs text-slate-400 font-mono ml-1">({roll})</span>}
                  {isSelf && <span className="text-blue-600 font-bold ml-1">(You)</span>}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-extrabold flex items-center gap-1 ${bgColor}`}>
                  {icon} {statusText}
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
                disabled={loading || isFinished}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {loading ? 'Processing...' : 'Accept & Consent'}
              </button>
              <button
                onClick={handleReject}
                disabled={loading || isFinished}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" /> Reject
              </button>
            </div>
          )}

          {isInitiator && !isFinished && (
            <button
              onClick={handleCancel}
              disabled={loading || isFinished}
              className="ml-auto px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition disabled:opacity-50"
            >
              Cancel Request
            </button>
          )}

          {request.status === 'Executed' && (
            <div className="text-xs text-emerald-800 font-extrabold flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Swap executed! Allocation PDFs regenerated.
            </div>
          )}
        </div>
      </div>

      {/* Custom Reusable Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        type={confirmDialog.type}
        title={confirmDialog.title}
        message={confirmDialog.message}
        details={confirmDialog.details}
        confirmLabel={confirmDialog.confirmLabel}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </>
  );
};

export default SwapRequestCard;
