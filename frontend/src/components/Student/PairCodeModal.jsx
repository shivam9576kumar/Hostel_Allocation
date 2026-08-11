import React, { useState } from 'react';
import { Key, Users, AlertCircle, X, ShieldCheck } from 'lucide-react';

const PairCodeModal = ({ room, onClose, onSubmitPairCode }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code || code.trim().length !== 6) {
      setError('Please enter a valid 6-digit numeric pairing code.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmitPairCode(code.trim());
    } catch (err) {
      setError(err.message || 'Pairing failed. Code may be invalid or expired.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 border border-blue-200">
          <Users className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold text-slate-900">Roommate Pairing Verification</h2>
        <p className="text-sm text-slate-600 mt-1">
          Enter the 6-digit pairing code shared by your primary roommate for <strong className="text-slate-900">Room {room?.room_number}</strong>.
        </p>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-red-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              6-Digit Pairing Code
            </label>
            <div className="relative">
              <Key className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
              <input
                type="text"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-12 pr-4 py-3 text-slate-900 text-xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-5 h-5" />
              {loading ? 'Validating...' : 'Verify & Lock Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PairCodeModal;
