// frontend/src/components/Student/SwapModal.jsx

import React, { useState, useEffect } from 'react';
import { X, ArrowLeftRight, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { getEligibleRooms, createSwapRequest } from '../../api/swap';

import SwapStepTargetRoom from './SwapStepTargetRoom';
import SwapStepType from './SwapStepType';
import SwapStepMovers from './SwapStepMovers';
import SwapStepSummary from './SwapStepSummary';
import SwapConfirmation from './SwapConfirmation';

const SwapModal = ({ isOpen, onClose, onSuccess, student }) => {
  const currentUserRoll = student?.roll_number;

  const [currentStep, setCurrentStep] = useState(1);
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
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [createdRequestData, setCreatedRequestData] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchRooms();
    } else {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setCurrentStep(1);
    setTargetRoomId('');
    setSwapType('single');
    setSingleTargetMover('');
    setDoubleSourcePartner('');
    setDoubleTargetMovers([]);
    setError('');
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

  // Toggle double swap target movers (select exactly 2)
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

  const handleNextStep = () => {
    setError('');
    if (currentStep === 1) {
      if (!targetRoomId) {
        setError('Please select a target room.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (swapType === 'full') {
        setCurrentStep(4); // Skip mover selection for Full swap
      } else {
        setCurrentStep(3);
      }
    } else if (currentStep === 3) {
      setCurrentStep(4);
    }
  };

  const handleBackStep = () => {
    setError('');
    if (currentStep === 4 && swapType === 'full') {
      setCurrentStep(2);
    } else {
      setCurrentStep(prev => Math.max(1, prev - 1));
    }
  };

  const handleSubmit = async () => {
    setError('');

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

      setCreatedRequestData(res.data.swapRequest);
      setConfirmationOpen(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to initiate room swap request.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-200 my-8 space-y-5">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="flex items-center gap-3">
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

          {/* Step Indicator */}
          <div className="flex items-center justify-between border-y border-slate-100 py-3 text-xs font-bold">
            <div className={`flex items-center gap-1.5 ${currentStep >= 1 ? 'text-amber-600' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentStep >= 1 ? 'bg-amber-500 text-slate-950 font-extrabold' : 'bg-slate-200 text-slate-500'}`}>1</span>
              <span>Target Room</span>
            </div>
            <span className="text-slate-300">&rarr;</span>
            <div className={`flex items-center gap-1.5 ${currentStep >= 2 ? 'text-amber-600' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentStep >= 2 ? 'bg-amber-500 text-slate-950 font-extrabold' : 'bg-slate-200 text-slate-500'}`}>2</span>
              <span>Swap Type</span>
            </div>
            {swapType !== 'full' && (
              <>
                <span className="text-slate-300">&rarr;</span>
                <div className={`flex items-center gap-1.5 ${currentStep >= 3 ? 'text-amber-600' : 'text-slate-400'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentStep >= 3 ? 'bg-amber-500 text-slate-950 font-extrabold' : 'bg-slate-200 text-slate-500'}`}>3</span>
                  <span>Movers</span>
                </div>
              </>
            )}
            <span className="text-slate-300">&rarr;</span>
            <div className={`flex items-center gap-1.5 ${currentStep >= 4 ? 'text-amber-600' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${currentStep >= 4 ? 'bg-amber-500 text-slate-950 font-extrabold' : 'bg-slate-200 text-slate-500'}`}>4</span>
              <span>Confirm</span>
            </div>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
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
            <>
              {currentStep === 1 && (
                <SwapStepTargetRoom
                  eligibleRooms={eligibleRooms}
                  targetRoomId={targetRoomId}
                  onSelectRoom={(id) => {
                    setTargetRoomId(id);
                    setSingleTargetMover('');
                    setDoubleTargetMovers([]);
                  }}
                  onNext={handleNextStep}
                  sourceRoom={sourceRoom}
                  roomCapacity={roomCapacity}
                />
              )}

              {currentStep === 2 && (
                <SwapStepType
                  swapType={swapType}
                  onSelectType={(type) => setSwapType(type)}
                  onNext={handleNextStep}
                  onBack={handleBackStep}
                  roomCapacity={roomCapacity}
                />
              )}

              {currentStep === 3 && (
                <SwapStepMovers
                  swapType={swapType}
                  sourceRoom={sourceRoom}
                  selectedRoom={selectedRoom}
                  currentUserRoll={currentUserRoll}
                  singleTargetMover={singleTargetMover}
                  onSelectSingleTargetMover={(roll) => setSingleTargetMover(roll)}
                  doubleSourcePartner={doubleSourcePartner}
                  onSelectDoubleSourcePartner={(roll) => setDoubleSourcePartner(roll)}
                  doubleTargetMovers={doubleTargetMovers}
                  onToggleDoubleTargetMover={toggleDoubleTargetMover}
                  onNext={handleNextStep}
                  onBack={handleBackStep}
                />
              )}

              {currentStep === 4 && (
                <SwapStepSummary
                  summary={summary}
                  sourceRoom={sourceRoom}
                  selectedRoom={selectedRoom}
                  currentUserRoll={currentUserRoll}
                  swapType={swapType}
                  loading={loading}
                  onSubmit={handleSubmit}
                  onBack={handleBackStep}
                  onCancel={onClose}
                />
              )}
            </>
          )}
        </div>
      </div>

      <SwapConfirmation
        isOpen={confirmationOpen}
        onClose={() => {
          setConfirmationOpen(false);
          onClose();
        }}
        onViewRequest={() => {
          setConfirmationOpen(false);
          onClose();
        }}
        createdRequestData={createdRequestData}
      />
    </>
  );
};

export default SwapModal;
