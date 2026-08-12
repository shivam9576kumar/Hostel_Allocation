import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, Power, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { getAdminSwapActive, toggleSwapActivity } from '../../api/swap';

const AdminSwapToggle = () => {
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fetchStatus = async () => {
    try {
      const res = await getAdminSwapActive();
      setIsActive(res.data.swapActive);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleToggle = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const nextState = !isActive;
      const res = await toggleSwapActivity(nextState);
      setIsActive(res.data.swapActive);
      setMessage(`Room Swap Activity is now ${res.data.swapActive ? 'ENABLED' : 'DISABLED'}`);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to toggle room swap status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-2xl ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
          <ArrowLeftRight className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            Room Swap Window Control
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase ${isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            {isActive
              ? 'Students with locked room bookings can initiate and consent to room swaps.'
              : 'Room swap requests are currently disabled. Toggle to open room swap activity.'}
          </p>
          {message && <p className="text-xs font-bold text-emerald-600 mt-1">{message}</p>}
          {error && <p className="text-xs font-bold text-rose-600 mt-1">{error}</p>}
        </div>
      </div>

      <button
        onClick={handleToggle}
        disabled={loading}
        className={`px-5 py-2.5 rounded-xl font-bold text-xs transition shadow-sm flex items-center gap-2 disabled:opacity-50 ${
          isActive
            ? 'bg-rose-600 hover:bg-rose-700 text-white'
            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
        }`}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
        {isActive ? 'Disable Room Swaps' : 'Enable Room Swaps'}
      </button>
    </div>
  );
};

export default AdminSwapToggle;
