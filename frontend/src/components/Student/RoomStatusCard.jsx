import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Users, 
  Clock, 
  Copy, 
  Share2, 
  CheckCircle2, 
  UserPlus, 
  Download,
  FileText,
  Lock,
  ArrowLeftRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getRoomOccupants, downloadAllocationPDF, getActiveSwap, getPdfStatus } from '../../api/student';
import SwapButton from './SwapButton';
import SwapModal from './SwapModal';
import SwapConsentCard from './SwapConsentCard';

const RoomStatusCard = ({ room: initialRoom, user }) => {
  const [room, setRoom] = useState(initialRoom || null);
  const [occupants, setOccupants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [swapActive, setSwapActive] = useState(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [isPdfReady, setIsPdfReady] = useState(false);
  const [polling, setPolling] = useState(false);

  const roomId = room?.room_id || room?.id;

  // Poll for PDF readiness when room is full / locked
  const capacityCheck = room?.capacity || 3;
  const currentOccupancyCheck = Math.max(room?.current_occupancy || 0, occupants.length);
  const isFullCheck = currentOccupancyCheck >= capacityCheck || room?.status === 'Locked';

  useEffect(() => {
    if (!isFullCheck) return;

    const checkStatus = async () => {
      try {
        const res = await getPdfStatus();
        if (res.data?.isReady) {
          setIsPdfReady(true);
          setPolling(false);
        }
      } catch (err) {
        console.error('Error checking PDF status:', err);
      }
    };

    checkStatus();
    if (!isPdfReady) {
      setPolling(true);
      const interval = setInterval(checkStatus, 8000);
      return () => clearInterval(interval);
    }
  }, [isFullCheck, isPdfReady]);

  // Poll for occupants & room state every 8 seconds
  useEffect(() => {
    if (!roomId) return;

    const fetchOccupantsData = async () => {
      try {
        const res = await getRoomOccupants(roomId);
        if (res.data?.success) {
          if (res.data.room) setRoom(res.data.room);
          if (res.data.occupants) setOccupants(res.data.occupants);
        }
      } catch (err) {
        console.error('Error fetching room occupants:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOccupantsData();
    const interval = setInterval(fetchOccupantsData, 8000);
    return () => clearInterval(interval);
  }, [roomId]);

  // Check swap window active status
  useEffect(() => {
    const checkSwap = async () => {
      try {
        const res = await getActiveSwap();
        setSwapActive(res.data?.swapActive || false);
      } catch (err) {
        console.error('Error checking swap status:', err);
      }
    };
    checkSwap();
  }, []);

  // Countdown timer for pairing code expiry
  useEffect(() => {
    if (!room?.code_expiry) return;

    const updateTimer = () => {
      const now = new Date();
      const expiry = new Date(room.code_expiry);
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));
      if (diff <= 0) {
        setTimeRemaining('Expired');
        return;
      }
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      setTimeRemaining(`${mins}:${secs.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [room?.code_expiry]);

  const capacity = room?.capacity || 3;
  const currentOccupancy = Math.max(room?.current_occupancy || 0, occupants.length);
  const isFull = currentOccupancy >= capacity || room?.status === 'Locked';
  const remainingSlots = Math.max(0, capacity - currentOccupancy);

  const hostelName = room?.Floor?.Block?.Hostel?.name || room?.hostelName || 'Hostel';
  const blockName = room?.Floor?.Block?.name || room?.blockName || 'Block';
  const floorNumber = room?.Floor?.floor_number !== undefined ? room.Floor.floor_number : (room?.floorNumber ?? 0);
  const roomNumber = room?.room_number || 'Room';
  const pairingCode = room?.pairing_code || '------';

  const copyCode = () => {
    if (!pairingCode || pairingCode === '------') return;
    navigator.clipboard.writeText(pairingCode);
    toast.success('Pairing code copied to clipboard!');
  };

  const shareLink = () => {
    if (!pairingCode || pairingCode === '------') return;
    const url = `${window.location.origin}/join?code=${pairingCode}`;
    navigator.clipboard.writeText(url);
    toast.success('Shareable join link copied to clipboard!');
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const response = await downloadAllocationPDF();
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Allocation_Certificate_${user?.roll_number || 'Student'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Allocation Certificate downloaded successfully!');
    } catch (err) {
      console.error('PDF Download Error:', err);
      toast.error('Failed to download allocation PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 animate-pulse mb-8">
        Loading room details...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
      {/* Room Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Home className="w-6 h-6 text-blue-600" />
              Room {roomNumber}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {hostelName} • {blockName} • Floor {floorNumber}
            </p>
          </div>

          <div className={`px-4 py-1.5 rounded-full text-xs font-bold border inline-flex items-center gap-1.5 self-start sm:self-center ${
            isFull 
              ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
              : 'bg-blue-100 text-blue-800 border-blue-200'
          }`}>
            {isFull ? (
              <>
                <Lock className="w-3.5 h-3.5" />
                {currentOccupancy}/{capacity} • Fully Booked
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                {currentOccupancy}/{capacity} • Pairing Pending
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-6 space-y-6">

        {/* Pairing Code Banner (if not full) */}
        {!isFull && pairingCode && pairingCode !== '------' && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase text-blue-600 tracking-wider block mb-1">
                Room Pairing Code
              </span>
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-black font-mono tracking-widest text-slate-900 bg-white px-3.5 py-1 rounded-lg border border-blue-200 shadow-inner">
                  {pairingCode}
                </span>
                {timeRemaining && (
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    Expires in {timeRemaining}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                onClick={copyCode}
                className="flex-1 md:flex-initial px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
              >
                <Copy className="w-4 h-4" />
                Copy Code
              </button>
              <button
                onClick={shareLink}
                className="flex-1 md:flex-initial px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
              >
                <Share2 className="w-4 h-4 text-slate-500" />
                Share Link
              </button>
            </div>
          </div>
        )}

        {/* Occupants Roster List */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-700">All Roommates ({occupants.length}/{capacity})</h3>
          </div>

          <div className="space-y-2.5 bg-slate-50 rounded-xl p-4 border border-slate-200">
            {occupants.map((occupant, index) => {
              const isCurrentUser = occupant.roll_number === user?.roll_number;
              const isPrimary = index === 0;
              return (
                <div key={occupant.roll_number} className="flex items-center justify-between py-1 border-b border-slate-200/60 last:border-0">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className={`w-4 h-4 ${isPrimary ? 'text-blue-600' : 'text-emerald-600'}`} />
                    <span className="font-semibold text-sm text-slate-900">{occupant.full_name}</span>
                    <span className="text-xs text-slate-400 font-mono">({occupant.roll_number})</span>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                    isPrimary 
                      ? 'bg-blue-50 text-blue-700 border-blue-200' 
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {isPrimary ? 'Primary' : isCurrentUser ? 'You (Joined)' : 'Joined'}
                  </span>
                </div>
              );
            })}

            {/* Waiting placeholders if room is not yet full */}
            {!isFull && Array.from({ length: remainingSlots }).map((_, idx) => (
              <div key={idx} className="flex items-center gap-2.5 py-1 text-slate-400">
                <UserPlus className="w-4 h-4 text-slate-300" />
                <span className="text-xs font-medium italic">Waiting for roommate #{occupants.length + idx + 1}...</span>
              </div>
            ))}
          </div>
        </div>

        {/* Room Swap Activity Section (When swap window is active) */}
        {swapActive && isFull && (
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-amber-600" />
                  Room Swap Window Active
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  You can propose or respond to room exchange proposals during the active swap window.
                </p>
              </div>
              <SwapButton onClick={() => setIsSwapModalOpen(true)} />
            </div>

            <SwapConsentCard studentRoll={user?.roll_number} onUpdate={() => window.location.reload()} />
          </div>
        )}

        {/* Locked Room Action Section */}
        {isFull ? (
          <div className="pt-2 text-center space-y-3">
            {isPdfReady ? (
              <>
                <p className="text-sm font-medium text-slate-700 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Your allocation certificate is ready for download.
                </p>

                <button
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-600/25 disabled:opacity-50"
                >
                  <Download className="w-5 h-5" />
                  {downloadingPdf ? 'Downloading Certificate...' : 'Download Official PDF'}
                </button>
              </>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col items-center gap-2 text-amber-900">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                  ⏳ Your PDF is being generated in the background. Please wait...
                </div>
                <button 
                  onClick={async () => {
                    const res = await getPdfStatus();
                    if (res.data?.isReady) setIsPdfReady(true);
                  }} 
                  className="text-xs text-blue-600 hover:underline font-semibold"
                >
                  Check now
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-500 text-center">
            ⚠️ Share your pairing code with roommates to complete room locking.
          </p>
        )}

      </div>

      {/* Swap Request Modal */}
      <SwapModal
        isOpen={isSwapModalOpen}
        onClose={() => setIsSwapModalOpen(false)}
        onSuccess={() => window.location.reload()}
        student={user}
      />
    </div>
  );
};

export default RoomStatusCard;
