import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Key, Copy, ArrowLeft } from 'lucide-react';

const PairingCodePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { pairingCode, codeExpiry, room } = location.state || {};

  if (!pairingCode) {
    toast.error('No pairing code found. Please book a room first.');
    navigate('/');
    return null;
  }

  const copyCode = () => {
    navigator.clipboard.writeText(pairingCode);
    toast.success('Pairing code copied!');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-lg w-full p-8 bg-white rounded-3xl shadow-xl border border-slate-200 text-center space-y-6">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mx-auto border border-blue-200">
          <Key className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-bold text-slate-900">🎯 Room Pairing Code</h2>
        <p className="text-slate-600 text-sm">
          Share this code with your roommate to lock the room allocation.
        </p>

        <div className="bg-slate-50 p-6 rounded-2xl border-2 border-blue-200">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest block mb-2">
            Dynamic Pairing Code
          </span>
          <div className="text-4xl font-extrabold font-mono tracking-widest text-blue-600 my-1">
            {pairingCode}
          </div>
          {codeExpiry && (
            <div className="text-xs text-slate-500 mt-2 font-medium">
              Expires at: {new Date(codeExpiry).toLocaleTimeString()}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={copyCode}
            className="flex-1 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-blue-600/30"
          >
            <Copy className="w-4 h-4" /> Copy Code
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex-1 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition flex items-center justify-center gap-2 border border-slate-200"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Portal
          </button>
        </div>

        {room && (
          <div className="text-xs text-slate-400 font-medium">
            Room {room.room_number || room.room_id} • {room.capacity || 2} Seater
          </div>
        )}
      </div>
    </div>
  );
};

export default PairingCodePage;
