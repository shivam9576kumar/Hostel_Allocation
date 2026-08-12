import React, { useState, useEffect } from 'react';
import { X, ArrowLeftRight, Users, User, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { getEligibleRooms, createSwapRequest } from '../../api/swap';

const SwapModal = ({ isOpen, onClose, onSuccess }) => {
  const [eligibleRooms, setEligibleRooms] = useState([]);
  const [targetRoomId, setTargetRoomId] = useState('');
  const [swapType, setSwapType] = useState('full');
  const [targetStudentRoll, setTargetStudentRoll] = useState('');

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchRooms();
    } else {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setTargetRoomId('');
    setSwapType('full');
    setTargetStudentRoll('');
    setError('');
    setMessage('');
  };

  const fetchRooms = async () => {
    setFetching(true);
    setError('');
    try {
      const res = await getEligibleRooms();
      const rooms = res.data.eligibleRooms || [];
      setEligibleRooms(rooms);
      if (rooms.length > 0) {
        setTargetRoomId(rooms[0].room_id);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to fetch eligible rooms for swap.');
    } finally {
      setFetching(false);
    }
  };

  const selectedRoom = eligibleRooms.find(r => String(r.room_id) === String(targetRoomId));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!targetRoomId) {
      setError('Please select a target room for swap.');
      return;
    }

    if (swapType === 'individual' && !targetStudentRoll) {
      setError('Please select a specific student to swap with for individual swap.');
      return;
    }

    setLoading(true);
    try {
      const res = await createSwapRequest({
        target_room_id: parseInt(targetRoomId, 10),
        swap_type: swapType,
        target_student_roll: swapType === 'individual' ? targetStudentRoll : null
      });

      setMessage(res.data.message || 'Swap request created successfully.');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to initiate room swap request.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <div className="p-2.5 bg-amber-100 rounded-2xl text-amber-700">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Initiate Room Swap</h3>
            <p className="text-xs text-slate-500">Request room exchange with occupied rooms in your hostel.</p>
          </div>
        </div>

        {error && (
          <div className="my-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="my-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{message}</span>
          </div>
        )}

        {fetching ? (
          <div className="py-12 text-center text-slate-500 text-sm flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            <span>Loading occupied hostel rooms...</span>
          </div>
        ) : eligibleRooms.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            No eligible occupied rooms available for swap in your hostel.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 mt-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Target Room</label>
              <select
                value={targetRoomId}
                onChange={(e) => {
                  setTargetRoomId(e.target.value);
                  setTargetStudentRoll('');
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500"
                required
              >
                {eligibleRooms.map(r => (
                  <option key={r.room_id} value={r.room_id}>
                    Room {r.room_number} ({r.Floor?.Block?.name} - Floor {r.Floor?.floor_number}) | {r.current_occupancy} Occupant(s)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-2">Swap Type</label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`p-3.5 border rounded-2xl cursor-pointer transition flex flex-col items-center gap-1.5 text-center ${
                    swapType === 'full' ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20' : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="swapType"
                    value="full"
                    checked={swapType === 'full'}
                    onChange={() => setSwapType('full')}
                    className="sr-only"
                  />
                  <Users className="w-5 h-5 text-amber-600" />
                  <span className="text-xs font-bold text-slate-900">Full Swap</span>
                  <span className="text-[10px] text-slate-500 leading-tight">Swap entire rooms (requires 4 consents)</span>
                </label>

                <label
                  className={`p-3.5 border rounded-2xl cursor-pointer transition flex flex-col items-center gap-1.5 text-center ${
                    swapType === 'individual' ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20' : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="swapType"
                    value="individual"
                    checked={swapType === 'individual'}
                    onChange={() => setSwapType('individual')}
                    className="sr-only"
                  />
                  <User className="w-5 h-5 text-amber-600" />
                  <span className="text-xs font-bold text-slate-900">Individual Swap</span>
                  <span className="text-[10px] text-slate-500 leading-tight">Swap with 1 student (requires 2 consents)</span>
                </label>
              </div>
            </div>

            {swapType === 'individual' && selectedRoom && (
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Select Target Student</label>
                <select
                  value={targetStudentRoll}
                  onChange={(e) => setTargetStudentRoll(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500"
                  required
                >
                  <option value="">-- Choose student from Room {selectedRoom.room_number} --</option>
                  {(selectedRoom.Students || []).map(s => (
                    <option key={s.roll_number} value={s.roll_number}>
                      {s.full_name} ({s.roll_number})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeftRight className="w-4 h-4" />}
                Submit Swap Request
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SwapModal;
