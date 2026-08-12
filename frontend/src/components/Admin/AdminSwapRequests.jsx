import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, CheckCircle2, XCircle, Filter, Zap, Trash2 } from 'lucide-react';
import { adminListRequests, adminForceExecute, adminCancelRequest } from '../../api/swap';
import SwapStatusBadge from '../Student/SwapStatusBadge';

const AdminSwapRequests = () => {
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await adminListRequests({ status: statusFilter });
      setRequests(res.data.swapRequests || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch swap requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const handleForceExecute = async (id) => {
    if (!window.confirm(`Force execute swap request #${id}? This will immediately swap room bookings.`)) return;
    setMessage('');
    setError('');
    try {
      const res = await adminForceExecute(id);
      setMessage(res.data.message || `Swap #${id} force-executed successfully.`);
      fetchRequests();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to force-execute swap.');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm(`Cancel swap request #${id}?`)) return;
    setMessage('');
    setError('');
    try {
      await adminCancelRequest(id);
      setMessage(`Swap request #${id} cancelled.`);
      fetchRequests();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to cancel request.');
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-amber-500" />
            Room Swap Requests Management
          </h2>
          <p className="text-xs text-slate-500">View, manage, force-execute, or cancel student room swap requests.</p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-amber-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-semibold"
          >
            <option value="ALL">All Statuses</option>
            <option value="Consenting">Consenting / Pending</option>
            <option value="Executed">Executed</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Expired">Expired</option>
          </select>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
              <th className="p-3.5">ID</th>
              <th className="p-3.5">Type</th>
              <th className="p-3.5">Initiator</th>
              <th className="p-3.5">Source → Target Room</th>
              <th className="p-3.5">Consents Progress</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {requests.map((r) => {
              const consents = typeof r.consents === 'string' ? JSON.parse(r.consents) : (r.consents || {});
              const consentedCount = Object.values(consents).filter(Boolean).length;
              const totalConsents = Object.keys(consents).length;

              return (
                <tr key={r.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3.5 font-bold text-slate-400">#{r.id}</td>
                  <td className="p-3.5 font-bold text-slate-900 capitalize">{r.swap_type}</td>
                  <td className="p-3.5 text-xs font-medium text-slate-800">
                    <div>{r.Initiator?.full_name}</div>
                    <div className="text-[10px] text-slate-400">{r.initiator_roll}</div>
                  </td>
                  <td className="p-3.5 font-semibold text-slate-900">
                    Room {r.SourceRoom?.room_number} → Room {r.TargetRoom?.room_number}
                  </td>
                  <td className="p-3.5 text-xs font-semibold text-slate-700">
                    {consentedCount} / {totalConsents} Consented
                  </td>
                  <td className="p-3.5">
                    <SwapStatusBadge status={r.status} />
                  </td>
                  <td className="p-3.5 text-right space-x-2">
                    {r.status !== 'Executed' && r.status !== 'Cancelled' && (
                      <>
                        <button
                          onClick={() => handleForceExecute(r.id)}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold transition inline-flex items-center gap-1"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          Force Execute
                        </button>
                        <button
                          onClick={() => handleCancel(r.id)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Cancel
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {requests.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400 text-sm">
                  No room swap requests found for the selected filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminSwapRequests;
