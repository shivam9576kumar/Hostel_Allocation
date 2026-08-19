import React, { useState, useEffect } from 'react';
import { pairByCode } from '../../api/student';
import { KeyRound, Loader2, AlertCircle } from 'lucide-react';

const PairCodeEntry = ({ onPairSuccess }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Clear stale error state when component mounts
  useEffect(() => {
    setError('');
    setLoading(false);
  }, []);

  const handleChange = (e) => {
    const val = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (val.length <= 8) {
      setCode(val);
      if (error) setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (code.trim().length < 6) {
      setError('Please enter a valid pairing code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await pairByCode(code.trim());
      setCode('');
      if (onPairSuccess) {
        await onPairSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to pair using code. Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-md border border-slate-700/60 mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Feature Header */}
        <div className="flex items-start gap-4 max-w-xl">
          <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center border border-blue-400/30 shrink-0 mt-0.5">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Instant Roommate Code Entry
              <span className="bg-blue-500/20 text-blue-300 text-xs px-2.5 py-0.5 rounded-full border border-blue-400/30 font-mono">Shortcut</span>
            </h2>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Have a pairing code from your roommate? Enter it here to bypass hostel selection and lock your room instantly!
            </p>
          </div>
        </div>

        {/* Code Input Form */}
        <form onSubmit={handleSubmit} className="w-full md:w-auto flex flex-col sm:flex-row items-stretch gap-3 shrink-0">
          <div className="relative flex-1 sm:w-56">
            <input
              type="text"
              maxLength={8}
              value={code}
              onChange={handleChange}
              placeholder="e.g. I1IK2TF0"
              disabled={loading}
              className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-3 text-center text-lg font-mono font-bold tracking-widest text-blue-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:opacity-50 uppercase"
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.trim().length < 6}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 text-white font-semibold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-sm shrink-0 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                Join Room →
              </>
            )}
          </button>
        </form>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mt-4 p-3 rounded-xl bg-red-900/40 border border-red-500/50 text-red-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default PairCodeEntry;
