import React, { useState, useEffect } from 'react';
import { X, ArrowLeftRight, Users, User, UserCheck, AlertCircle, CheckCircle2, Loader2, Info } from 'lucide-react';
import { getEligibleRooms, createSwapRequest } from '../../api/swap';

const SwapModal = ({ isOpen, onClose, onSuccess, student }) => {
  const currentUserRoll = student?.roll_number;

  const [eligibleRooms, setEligibleRooms] = useState([]);
  const [sourceRoom, setSourceRoom] = useState(null);
  const [targetRoomId, setTargetRoomId] = useState('');
  const [swapType, setSwapType] = useState('single');

  // Mover selection states
  const [singleTargetMover, setSingleTargetMover] = useState('');
  const [doubleSourcePartner, setDoubleSourcePartner] = useState('');
  const [doubleTargetMovers, setDoubleTargetMovers] = useState([]);

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
    setSwapType('single');
    setSingleTargetMover('');
    setDoubleSourcePartner('');
    setDoubleTargetMovers([]);
    setError('');
    setMessage('');
  };

  const fetchRooms = async () => {
    setFetching(true);
    setError('');
    try {
      const res = await getEligibleRooms();
      const rooms = res.data.eligibleRooms || [];
      const srcRoom = res.data.sourceRoom || null;
      setEligibleRooms(rooms);
      setSourceRoom(srcRoom);

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
  const roomCapacity = sourceRoom?.capacity || selectedRoom?.capacity || 2;

  // Toggle selection for double swap target movers (must pick exactly 2)
  const toggleDoubleTargetMover = (roll) => {
    if (doubleTargetMovers.includes(roll)) {
      setDoubleTargetMovers(doubleTargetMovers.filter(r => r !== roll));
    } else {
      if (doubleTargetMovers.length >= 2) {
        setDoubleTargetMovers([doubleTargetMovers[1], roll]);
      } else {
        setDoubleTargetMovers([...doubleTargetMovers, roll]);
      }
    }
  };

  // Compile source roommates (excluding initiator)
  const sourceRoommates = (sourceRoom?.occupants || []).filter(
    s => s.roll_number !== currentUserRoll
  );

  // Compile summary data
  const getSwapSummary = () => {
    if (!selectedRoom) return null;

    let sourceMoversList = [];
    let targetMoversList = [];
    let sourceStayersList = [];
    let targetStayersList = [];

    const allSource = sourceRoom?.occupants || [];
    const allTarget = selectedRoom.Students || [];

    if (swapType === 'single') {
      sourceMoversList = allSource.filter(s => s.roll_number === currentUserRoll);
      targetMoversList = allTarget.filter(s => s.roll_number === singleTargetMover);
      sourceStayersList = allSource.filter(s => s.roll_number !== currentUserRoll);
      targetStayersList = allTarget.filter(s => s.roll_number !== singleTargetMover);
    } else if (swapType === 'double') {
      sourceMoversList = allSource.filter(
        s => s.roll_number === currentUserRoll || s.roll_number === doubleSourcePartner
      );
      targetMoversList = allTarget.filter(s => doubleTargetMovers.includes(s.roll_number));
      sourceStayersList = allSource.filter(
        s => s.roll_number !== currentUserRoll && s.roll_number !== doubleSourcePartner
      );
      targetStayersList = allTarget.filter(s => !doubleTargetMovers.includes(s.roll_number));
    } else if (swapType === 'full') {
      sourceMoversList = allSource;
      targetMoversList = allTarget;
      sourceStayersList = [];
      targetStayersList = [];
    }

    const consentsRequired = sourceMoversList.length + targetMoversList.length;
    const totalCertificates = (allSource.length || roomCapacity) + (allTarget.length || roomCapacity);

    return {
      sourceMoversList,
      targetMoversList,
      sourceStayersList,
      targetStayersList,
      consentsRequired,
      totalCertificates
    };
  };

  const summary = getSwapSummary();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!targetRoomId || !selectedRoom) {
      setError('Please select an eligible target room for swap.');
      return;
    }

    let sourceMovers = [];
    let targetMovers = [];

    if (swapType === 'single') {
      if (!singleTargetMover) {
        setError('Please select a student from the target room to swap with.');
        return;
      }
      sourceMovers = [currentUserRoll];
      targetMovers = [singleTargetMover];
    } else if (swapType === 'double') {
      if (!doubleSourcePartner) {
        setError('Please select 1 roommate from your room to move with you.');
        return;
      }
      if (doubleTargetMovers.length !== 2) {
        setError('Please select exactly 2 students from the target room.');
        return;
      }
      sourceMovers = [currentUserRoll, doubleSourcePartner];
      targetMovers = doubleTargetMovers;
    } else if (swapType === 'full') {
      sourceMovers = (sourceRoom?.occupants || []).map(s => s.roll_number);
      targetMovers = (selectedRoom.Students || []).map(s => s.roll_number);
    }

    setLoading(true);
    try {
      const res = await createSwapRequest({
        target_room_id: parseInt(targetRoomId, 10),
        swap_type: swapType,
        movers: {
          source_movers: sourceMovers,
          target_movers: targetMovers
        }
      });

      setMessage(res.data.message || 'Swap request created successfully!');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1800);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to initiate room swap request.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-200 my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-amber-100 rounded-2xl text-amber-700">
            <ArrowLeftRight className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-slate-900">Initiate Room Swap</h3>
              <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-full border border-slate-200">
                {roomCapacity}-Seater Rooms
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Your Room: {sourceRoom?.room_number || student?.BookedRoom?.room_number || 'Your Room'} ({sourceRoom?.occupants?.length || roomCapacity}/{roomCapacity} occupants)
            </p>
          </div>
        </div>

        {error && (
          <div className="my-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="my-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{message}</span>
          </div>
        )}

        {fetching ? (
          <div className="py-12 text-center text-slate-500 text-sm flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            <span>Finding eligible fully occupied rooms in your hostel...</span>
          </div>
        ) : eligibleRooms.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-2">
            <p className="font-semibold text-slate-700">No eligible rooms available for swap.</p>
            <p className="text-xs text-slate-500">
              Only fully occupied {roomCapacity}-seater rooms in your hostel not currently in active swaps can participate.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Step 1: Select Target Room */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                Step 1: Select Target Room ({eligibleRooms.length} Eligible)
              </label>
              <select
                value={targetRoomId}
                onChange={(e) => {
                  setTargetRoomId(e.target.value);
                  setSingleTargetMover('');
                  setDoubleTargetMovers([]);
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500"
                required
              >
                {eligibleRooms.map(r => (
                  <option key={r.room_id} value={r.room_id}>
                    Room {r.room_number} ({r.Floor?.Block?.name} - Floor {r.Floor?.floor_number}) | Fully Occupied ({r.current_occupancy}/{r.capacity})
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Choose Swap Type */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-2">
                Step 2: Choose Swap Type
              </label>
              <div className={`grid gap-2.5 ${roomCapacity === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {/* Single Swap (1 <-> 1) */}
                <label
                  className={`p-3 border rounded-2xl cursor-pointer transition flex flex-col items-center gap-1 text-center ${
                    swapType === 'single'
                      ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <input
                    type="radio"
                    name="swapType"
                    value="single"
                    checked={swapType === 'single'}
                    onChange={() => setSwapType('single')}
                    className="sr-only"
                  />
                  <User className="w-5 h-5 text-amber-600" />
                  <span className="text-xs font-bold text-slate-900">Single Swap</span>
                  <span className="text-[10px] text-slate-500 leading-tight">1 ↔ 1 (2 Consents)</span>
                </label>

                {/* Double Swap (2 <-> 2) - only for 3-seater */}
                {roomCapacity === 3 && (
                  <label
                    className={`p-3 border rounded-2xl cursor-pointer transition flex flex-col items-center gap-1 text-center ${
                      swapType === 'double'
                        ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="swapType"
                      value="double"
                      checked={swapType === 'double'}
                      onChange={() => setSwapType('double')}
                      className="sr-only"
                    />
                    <UserCheck className="w-5 h-5 text-amber-600" />
                    <span className="text-xs font-bold text-slate-900">Double Swap</span>
                    <span className="text-[10px] text-slate-500 leading-tight">2 ↔ 2 (4 Consents)</span>
                  </label>
                )}

                {/* Full Swap */}
                <label
                  className={`p-3 border rounded-2xl cursor-pointer transition flex flex-col items-center gap-1 text-center ${
                    swapType === 'full'
                      ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
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
                  <span className="text-[10px] text-slate-500 leading-tight">
                    {roomCapacity === 3 ? '3 ↔ 3 (6 Consents)' : '2 ↔ 2 (4 Consents)'}
                  </span>
                </label>
              </div>
            </div>

            {/* Step 3: Select Movers based on swap type */}
            {selectedRoom && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3.5">
                <div className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-amber-600" />
                  Step 3: Select Movers
                </div>

                {/* Single Swap Selection */}
                {swapType === 'single' && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-600">
                      You (<span className="font-semibold text-slate-900">{currentUserRoll}</span>) will move to Room {selectedRoom.room_number}. Select the student moving to your room:
                    </p>
                    <select
                      value={singleTargetMover}
                      onChange={(e) => setSingleTargetMover(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500"
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

                {/* Double Swap Selection (Capacity 3) */}
                {swapType === 'double' && (
                  <div className="space-y-3.5">
                    {/* Select 1 roommate from source room */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Select 1 roommate from your room to move with you:
                      </label>
                      <select
                        value={doubleSourcePartner}
                        onChange={(e) => setDoubleSourcePartner(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500"
                        required
                      >
                        <option value="">-- Choose your moving roommate --</option>
                        {sourceRoommates.map(s => (
                          <option key={s.roll_number} value={s.roll_number}>
                            {s.full_name} ({s.roll_number})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Select 2 students from target room */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Select 2 students from Room {selectedRoom.room_number} ({doubleTargetMovers.length}/2 selected):
                      </label>
                      <div className="space-y-1.5">
                        {(selectedRoom.Students || []).map(s => {
                          const isSelected = doubleTargetMovers.includes(s.roll_number);
                          return (
                            <div
                              key={s.roll_number}
                              onClick={() => toggleDoubleTargetMover(s.roll_number)}
                              className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition ${
                                isSelected
                                  ? 'bg-amber-100/70 border-amber-400 font-bold text-amber-900'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <span>{s.full_name} ({s.roll_number})</span>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 pointer-events-none"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Full Swap Notice */}
                {swapType === 'full' && (
                  <div className="text-xs text-slate-600 space-y-1 bg-white p-3 rounded-xl border border-slate-200">
                    <p className="font-semibold text-slate-800">
                      All {roomCapacity} occupants in both rooms will exchange rooms.
                    </p>
                    <p className="text-slate-500">
                      No selection needed. All {roomCapacity * 2} students will be required to give consent.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Summary Card */}
            {summary && (
              <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 space-y-2 text-xs">
                <div className="font-extrabold text-amber-900 flex items-center gap-1.5 text-xs">
                  <Info className="w-4 h-4 text-amber-700 shrink-0" />
                  Swap Summary & Impact
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-700">
                  <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                    <span className="font-bold text-slate-900 block mb-0.5">Moving to Room {selectedRoom?.room_number}:</span>
                    {summary.sourceMoversList.map(s => (
                      <div key={s.roll_number} className="text-slate-700">
                        • {s.full_name || s.roll_number} {s.roll_number === currentUserRoll ? '(You)' : ''}
                      </div>
                    ))}
                    {summary.sourceStayersList.length > 0 && (
                      <div className="text-slate-500 mt-1 italic">
                        Staying in your room: {summary.sourceStayersList.map(s => s.full_name || s.roll_number).join(', ')}
                      </div>
                    )}
                  </div>

                  <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                    <span className="font-bold text-slate-900 block mb-0.5">Moving to Your Room:</span>
                    {summary.targetMoversList.length > 0 ? (
                      summary.targetMoversList.map(s => (
                        <div key={s.roll_number} className="text-slate-700">• {s.full_name || s.roll_number}</div>
                      ))
                    ) : (
                      <span className="text-amber-800 italic">Select mover(s) above</span>
                    )}
                    {summary.targetStayersList.length > 0 && (
                      <div className="text-slate-500 mt-1 italic">
                        Staying in Room {selectedRoom?.room_number}: {summary.targetStayersList.map(s => s.full_name || s.roll_number).join(', ')}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-1 flex flex-wrap items-center justify-between text-[11px] text-amber-900 font-semibold border-t border-amber-200/60">
                  <span>Consents required: <strong className="text-slate-900">{summary.consentsRequired} mover(s)</strong> (Stayers are notified automatically)</span>
                  <span className="text-slate-600">All {summary.totalCertificates} students will receive updated PDFs</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || (swapType === 'single' && !singleTargetMover) || (swapType === 'double' && (doubleTargetMovers.length !== 2 || !doubleSourcePartner))}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold rounded-xl text-xs transition shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
