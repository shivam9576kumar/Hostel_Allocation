import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, Check, X, Clock, RefreshCw } from 'lucide-react';
import { getStudentSwapRequests, getSwapStatus, giveConsent, cancelRequest } from '../../api/swap';
import SwapStatusBadge from './SwapStatusBadge';

// Helper to normalize roll strings (trim whitespace, lowercasing for checks)
const normalizeRoll = (r) => (r || '').toString().trim();

// Helper to resolve matching consent object key despite case or spacing differences
const findConsentKey = (targetRoll, consentsObj) => {
  if (!targetRoll || !consentsObj) return null;
  const cleanTarget = normalizeRoll(targetRoll).toLowerCase();

  // 1. Direct exact key match
  if (targetRoll in consentsObj) return targetRoll;

  // 2. Case-insensitive & trimmed key match
  const keys = Object.keys(consentsObj);
  const matchedKey = keys.find(k => k.toString().trim().toLowerCase() === cleanTarget);
  if (matchedKey) return matchedKey;

  // 3. Partial / substring match fallback
  return keys.find(k => k.toLowerCase().includes(cleanTarget) || cleanTarget.includes(k.toLowerCase())) || null;
};

const SwapConsentCard = ({ requestId, currentUserRoll, studentRoll, onUpdate }) => {
  const rawRoll = normalizeRoll(currentUserRoll || studentRoll);
  const [resolvedRoll, setResolvedRoll] = useState(rawRoll);

  // Single Request State
  const [singleRequest, setSingleRequest] = useState(null);
  const [consents, setConsents] = useState({});
  const [requestStatus, setRequestStatus] = useState('Pending');

  // List Requests State (when requestId is not provided)
  const [requestsList, setRequestsList] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  // Fetch status helper with normalization
  const fetchStatus = async () => {
    try {
      if (requestId) {
        const res = await getSwapStatus(requestId);
        const reqData = res.data.swapRequest;
        if (reqData) {
          setSingleRequest(reqData);
          const parsedConsents = typeof reqData.consents === 'string' ? JSON.parse(reqData.consents) : (reqData.consents || {});

          // Normalize keys: trim spaces
          const normalizedConsents = {};
          Object.entries(parsedConsents).forEach(([key, value]) => {
            normalizedConsents[key.trim()] = value;
          });

          // Resolve matching roll key for current user
          const activeKey = findConsentKey(rawRoll, normalizedConsents) || rawRoll;
          setResolvedRoll(activeKey);
          setConsents(normalizedConsents);
          setRequestStatus(reqData.status || 'Pending');

          console.log('🔍 FETCH STATUS LOGS:');
          console.log('  - rawRoll:', rawRoll);
          console.log('  - Consent keys from DB:', Object.keys(normalizedConsents));
          console.log('  - Resolved key:', findConsentKey(rawRoll, normalizedConsents));
          console.log('  - resolvedRoll set to:', activeKey);
          console.log('  - consents object:', normalizedConsents);
        }
      } else {
        const res = await getStudentSwapRequests();
        setRequestsList(res.data.swapRequests || []);
      }
      setError(null);
    } catch (err) {
      console.error('Fetch swap status error:', err);
      setError('Failed to fetch swap request details.');
    } finally {
      setLoading(false);
    }
  };

  // Poll every 3 seconds
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [requestId]);

  // Handle Accept
  const handleAccept = async (targetReqId) => {
    const activeId = targetReqId || requestId;
    setLoading(true);

    console.log('✅ ACCEPT LOG:');
    console.log('  - current resolvedRoll:', resolvedRoll);
    console.log('  - consents before update:', consents);

    // Optimistic Local State Update using resolvedRoll
    if (requestId) {
      setConsents(prev => ({ ...prev, [resolvedRoll]: true }));
    } else {
      setRequestsList(prev =>
        prev.map(r => {
          if (r.id === activeId) {
            const parsed = typeof r.consents === 'string' ? JSON.parse(r.consents) : { ...(r.consents || {}) };
            const matchingKey = findConsentKey(rawRoll, parsed) || rawRoll;
            parsed[matchingKey] = true;
            return { ...r, consents: parsed };
          }
          return r;
        })
      );
    }
    console.log('  - consents after optimistic update:', { ...consents, [resolvedRoll]: true });

    try {
      await giveConsent(activeId, true);
      setToastMsg('✅ You have consented to the room swap!');
      setTimeout(() => setToastMsg(null), 4000);
      await fetchStatus();
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to record consent.');
      await fetchStatus(); // Re-sync state on failure
    } finally {
      setLoading(false);
    }
  };

  // Handle Reject
  const handleReject = async (targetReqId) => {
    if (!window.confirm('Are you sure you want to reject this swap request?')) return;
    const activeId = targetReqId || requestId;
    setLoading(true);

    // Optimistic Local State Update using resolvedRoll
    if (requestId) {
      setConsents(prev => ({ ...prev, [resolvedRoll]: false }));
      setRequestStatus('Cancelled');
    } else {
      setRequestsList(prev =>
        prev.map(r => {
          if (r.id === activeId) {
            const parsed = typeof r.consents === 'string' ? JSON.parse(r.consents) : { ...(r.consents || {}) };
            const matchingKey = findConsentKey(rawRoll, parsed) || rawRoll;
            parsed[matchingKey] = false;
            return { ...r, consents: parsed, status: 'Cancelled' };
          }
          return r;
        })
      );
    }

    try {
      await giveConsent(activeId, false);
      setToastMsg('❌ You have rejected the swap request.');
      setTimeout(() => setToastMsg(null), 4000);
      await fetchStatus();
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to reject request.');
      await fetchStatus();
    } finally {
      setLoading(false);
    }
  };

  // Handle Cancel
  const handleCancel = async (targetReqId) => {
    if (!window.confirm('Are you sure you want to cancel this swap request?')) return;
    const activeId = targetReqId || requestId;
    setLoading(true);
    try {
      await cancelRequest(activeId);
      setToastMsg('Swap request cancelled.');
      setTimeout(() => setToastMsg(null), 3000);
      await fetchStatus();
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to cancel request.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !singleRequest && requestsList.length === 0) {
    return <div className="p-4 text-center text-xs font-semibold text-slate-500">Loading swap request...</div>;
  }

  // Single Request Mode (when requestId prop is specified)
  if (requestId && singleRequest) {
    const totalStudents = Object.keys(consents).length;
    const consentedCount = Object.values(consents).filter(v => v === true).length;
    const progressPercentage = totalStudents > 0 ? (consentedCount / totalStudents) * 100 : 0;

    const activeKey = findConsentKey(resolvedRoll, consents) || resolvedRoll;
    const currentUserConsent = consents[activeKey];
    const isFinished = ['Executed', 'Cancelled', 'Expired'].includes(requestStatus);
    const showButtons = !isFinished && currentUserConsent !== true && requestStatus !== 'Cancelled';
    const isInitiator = normalizeRoll(singleRequest.initiator_roll).toLowerCase() === rawRoll.toLowerCase();

    console.log('🖥️ RENDER LOGS:');
    console.log('  - resolvedRoll:', resolvedRoll);
    console.log('  - consents:', consents);
    console.log('  - currentUserConsent:', currentUserConsent);
    console.log('  - showButtons:', showButtons);
    console.log('  - requestStatus:', requestStatus);

    return (
      <div className="border border-slate-200 rounded-2xl p-6 shadow-sm bg-white mb-4 space-y-4">
        {toastMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl">
            {toastMsg}
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-3">
          <div>
            <h3 className="font-extrabold text-lg text-slate-900">Request #{requestId}</h3>
            <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
              Room {singleRequest.source_room_id || singleRequest.SourceRoom?.room_number} <ArrowLeftRight className="w-4 h-4 text-amber-500" /> Room {singleRequest.target_room_id || singleRequest.TargetRoom?.room_number} ({singleRequest.swap_type} swap)
            </p>
            <p className="text-xs text-slate-500 mt-1">Initiator: {singleRequest.Initiator?.full_name || singleRequest.initiator_roll} ({singleRequest.initiator_roll})</p>
            <p className="text-xs text-slate-500">Expires At: {singleRequest.expires_at ? new Date(singleRequest.expires_at).toLocaleString() : 'N/A'}</p>
          </div>
          <SwapStatusBadge status={requestStatus} />
        </div>

        {/* Consent Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-bold text-slate-700">
            <span>Consent Progress ({consentedCount}/{totalStudents})</span>
            <span className="text-amber-600">{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
            <div
              className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Consent Status List */}
        <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
          {Object.entries(consents).map(([rollKey, consented]) => {
            const isCurrentUser = normalizeRoll(rollKey).toLowerCase() === rawRoll.toLowerCase();
            let statusText = 'Pending';
            let bgColor = 'bg-amber-100';
            let textColor = 'text-amber-800';
            let icon = '⏳';

            if (consented === true) {
              statusText = 'Consented';
              bgColor = 'bg-emerald-100';
              textColor = 'text-emerald-800';
              icon = '✅';
            } else if (consented === false && !isCurrentUser) {
              statusText = 'Rejected';
              bgColor = 'bg-rose-100';
              textColor = 'text-rose-800';
              icon = '❌';
            }

            return (
              <div key={rollKey} className="flex items-center justify-between">
                <span className="font-mono text-xs text-slate-700 font-bold">
                  {rollKey.trim()} {isCurrentUser && <span className="text-xs font-bold text-slate-500">(You)</span>}
                </span>
                <span className={`px-3 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${bgColor} ${textColor}`}>
                  {icon} {statusText}
                </span>
              </div>
            );
          })}
        </div>

        {/* Action Buttons or Status Message */}
        {showButtons ? (
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => handleAccept(requestId)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" /> Accept & Swap
            </button>
            <button
              onClick={() => handleReject(requestId)}
              className="bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 px-6 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <X className="w-4 h-4" /> Reject Request
            </button>
          </div>
        ) : (
          <div className="text-xs font-semibold text-slate-600 pt-1">
            {requestStatus === 'Executed' && '✅ Swap executed successfully! New PDFs generated.'}
            {requestStatus === 'Cancelled' && '❌ Swap request cancelled.'}
            {requestStatus === 'Expired' && '⏰ Swap request expired.'}
            {currentUserConsent === true && !isFinished && requestStatus !== 'Cancelled' && '⏳ Waiting for others to consent...'}
            {currentUserConsent === false && !isFinished && '❌ You have rejected this swap request.'}
          </div>
        )}

        {isInitiator && !isFinished && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => handleCancel(requestId)}
              className="px-3.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 rounded-lg"
            >
              Cancel Request
            </button>
          </div>
        )}
      </div>
    );
  }

  // Requests List Mode (when no single requestId prop is provided)
  if (requestsList.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-amber-500" />
          Room Swap Requests ({requestsList.length})
        </h3>
        <button
          onClick={fetchStatus}
          className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {toastMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl">
          {toastMsg}
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {requestsList.map(req => {
          const parsedConsents = typeof req.consents === 'string' ? JSON.parse(req.consents) : (req.consents || {});
          
          // Normalize keys for list item
          const consentsMap = {};
          Object.entries(parsedConsents).forEach(([k, v]) => {
            consentsMap[k.trim()] = v;
          });

          const activeKey = findConsentKey(rawRoll, consentsMap) || rawRoll;
          const myConsent = consentsMap[activeKey];
          const isInitiator = normalizeRoll(req.initiator_roll).toLowerCase() === rawRoll.toLowerCase();
          const isFinished = ['Executed', 'Cancelled', 'Expired'].includes(req.status);
          const rolls = Object.keys(consentsMap);
          const totalStudents = rolls.length;
          const consentedCount = Object.values(consentsMap).filter(v => v === true).length;
          const progressPercentage = totalStudents > 0 ? (consentedCount / totalStudents) * 100 : 0;

          const showButtons = !isFinished && myConsent !== true && req.status !== 'Cancelled';

          return (
            <div key={req.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Request #{req.id}</span>
                  <div className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5 mt-0.5">
                    Room {req.SourceRoom?.room_number} <ArrowLeftRight className="w-4 h-4 text-amber-500" /> Room {req.TargetRoom?.room_number}
                    <span className="text-xs font-medium text-slate-500">({req.swap_type} swap)</span>
                  </div>
                </div>
                <SwapStatusBadge status={req.status} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Initiator:</span>{' '}
                  <span className="font-bold text-slate-800">{req.Initiator?.full_name} ({req.initiator_roll})</span>
                </div>
                {req.TargetStudent && (
                  <div>
                    <span className="text-slate-500 font-medium">Target Student:</span>{' '}
                    <span className="font-bold text-slate-800">{req.TargetStudent?.full_name} ({req.target_student_roll})</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-500 font-medium">Expires At:</span>{' '}
                  <span className="font-bold text-slate-800">{new Date(req.expires_at).toLocaleString()}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                  <span>Consent Progress ({consentedCount}/{totalStudents})</span>
                  <span className="text-amber-600">{Math.round(progressPercentage)}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>

                <div className="space-y-1.5 pt-1">
                  {Object.entries(consentsMap).map(([rollKey, status]) => {
                    const isSelf = normalizeRoll(rollKey).toLowerCase() === rawRoll.toLowerCase();
                    let badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
                    let icon = <Clock className="w-3.5 h-3.5" />;
                    let statusLabel = 'Pending';

                    if (status === true) {
                      badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      icon = <Check className="w-3.5 h-3.5" />;
                      statusLabel = 'Consented';
                    } else if (req.status === 'Cancelled' && status === false) {
                      badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
                      icon = <X className="w-3.5 h-3.5" />;
                      statusLabel = 'Rejected';
                    }

                    return (
                      <div key={rollKey} className="flex items-center justify-between text-xs py-0.5">
                        <span className="font-semibold text-slate-700 font-mono">
                          {rollKey.trim()} {isSelf ? '(You)' : ''}:
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold flex items-center gap-1 ${badgeClass}`}>
                          {icon} {statusLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-1">
                {showButtons ? (
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      onClick={() => handleReject(req.id)}
                      disabled={loading}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <X className="w-4 h-4" /> Reject Request
                    </button>
                    <button
                      onClick={() => handleAccept(req.id)}
                      disabled={loading}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                    >
                      <Check className="w-4 h-4" /> Accept & Swap
                    </button>
                  </div>
                ) : (
                  <div className="text-xs font-medium text-slate-500 pt-1">
                    {req.status === 'Executed' && (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <Check className="w-4 h-4" /> Room swap executed successfully! Updated allocation PDF is ready for download.
                      </span>
                    )}
                    {req.status === 'Cancelled' && (
                      <span className="text-rose-600 font-bold flex items-center gap-1">
                        <X className="w-4 h-4" /> Request cancelled or rejected by an occupant.
                      </span>
                    )}
                    {req.status === 'Expired' && (
                      <span className="text-slate-500 font-bold flex items-center gap-1">
                        <Clock className="w-4 h-4" /> Swap request has expired (24h TTL).
                      </span>
                    )}
                    {myConsent === true && !isFinished && (
                      <span className="text-amber-600 font-bold flex items-center gap-1">
                        <Clock className="w-4 h-4" /> You have consented. Waiting for remaining students to consent...
                      </span>
                    )}
                  </div>
                )}

                {isInitiator && !isFinished && (
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => handleCancel(req.id)}
                      disabled={loading}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition"
                    >
                      Cancel Request
                    </button>
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SwapConsentCard;
