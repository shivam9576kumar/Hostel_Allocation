import React, { useState, useEffect } from 'react';
import { Key, Copy, Check, Clock, AlertTriangle, ShieldCheck, X } from 'lucide-react';

const BookingModal = ({ room, onClose, onConfirmBooking, bookingResult }) => {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 mins = 600 seconds
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!bookingResult?.codeExpiry) return;

    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(bookingResult.codeExpiry).getTime() - new Date().getTime()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [bookingResult]);

  const handleCopyCode = () => {
    if (bookingResult?.pairingCode) {
      navigator.clipboard.writeText(bookingResult.pairingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition"
        >
          <X className="w-6 h-6" />
        </button>

        {!bookingResult ? (
          <div>
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Confirm Room Selection</h2>
            <p className="text-sm text-slate-600 mt-2">
              You are selecting <strong className="text-slate-900">Room {room?.room_number}</strong>. Booking this room will generate a temporary 10-minute pairing code for your roommate.
            </p>

            <div className="my-6 bg-slate-50 rounded-2xl p-4 border border-slate-200 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Room Number:</span>
                <span className="font-bold text-slate-900">{room?.room_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Capacity:</span>
                <span className="font-semibold text-slate-800">2 Students</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Pairing Window:</span>
                <span className="font-semibold text-amber-600">10 Minutes</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setLoading(true);
                  await onConfirmBooking();
                  setLoading(false);
                }}
                disabled={loading}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
              >
                {loading ? 'Generating Code...' : 'Confirm & Book'}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-amber-200">
              <Key className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-bold text-slate-900">Dynamic 10-Minute Pairing Code</h2>
            <p className="text-xs text-slate-500 mt-1">Share this code with your designated roommate immediately.</p>

            {/* Code Box */}
            <div className="my-6 bg-amber-50 rounded-2xl p-6 border-2 border-amber-300 flex flex-col items-center">
              <span className="text-xs font-semibold text-amber-800 uppercase tracking-widest mb-1">Your Pairing Code</span>
              <div className="text-4xl font-extrabold text-amber-950 tracking-widest my-2 font-mono">
                {bookingResult.pairingCode}
              </div>

              <button
                onClick={handleCopyCode}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold shadow-md transition"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Code Copied!' : 'Copy Code'}
              </button>
            </div>

            {/* Countdown Timer */}
            <div className="flex items-center justify-center gap-2 text-amber-700 bg-amber-100/60 py-2.5 px-4 rounded-xl text-sm font-medium mb-6">
              <Clock className="w-4 h-4 animate-spin text-amber-600" />
              <span>Time Remaining: <strong>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</strong></span>
            </div>

            <div className="text-xs text-slate-500 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <AlertTriangle className="w-4 h-4 text-amber-500 inline mr-1" />
              If your roommate does not enter this code within 10 minutes, the room reservation will expire and revert to vacant status.
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition"
            >
              Done / Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingModal;
