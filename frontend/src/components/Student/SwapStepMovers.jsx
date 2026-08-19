// frontend/src/components/Student/SwapStepMovers.jsx

import React from 'react';
import { UserCheck, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';

const SwapStepMovers = ({
  swapType,
  sourceRoom,
  selectedRoom,
  currentUserRoll,
  singleTargetMover,
  onSelectSingleTargetMover,
  doubleSourcePartner,
  onSelectDoubleSourcePartner,
  doubleTargetMovers,
  onToggleDoubleTargetMover,
  onNext,
  onBack,
}) => {
  const sourceRoommates = (sourceRoom?.occupants || []).filter(
    s => s.roll_number !== currentUserRoll
  );
  const targetStudents = selectedRoom?.Students || [];

  const isValid = () => {
    if (swapType === 'single') {
      return Boolean(singleTargetMover);
    }
    if (swapType === 'double') {
      return Boolean(doubleSourcePartner) && doubleTargetMovers.length === 2;
    }
    return true; // Full swap doesn't need mover selection
  };

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
          <UserCheck className="w-4 h-4 text-amber-500" />
          Step 3: Select Movers
        </h4>
        <p className="text-xs text-slate-500 mt-1">
          Pick which student(s) will move between the two rooms.
        </p>
      </div>

      {/* SINGLE SWAP SELECTION */}
      {swapType === 'single' && (
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
            <span className="font-bold text-slate-800">From Your Room:</span>
            <p className="text-slate-600">
              • You (<strong className="text-slate-900">{sourceRoom?.occupants?.find(s => s.roll_number === currentUserRoll)?.full_name || currentUserRoll}</strong>) will be the mover from your room.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Select 1 Mover from Room {selectedRoom?.room_number}:
            </label>
            <div className="space-y-1.5">
              {targetStudents.map(student => {
                const isSelected = singleTargetMover === student.roll_number;
                return (
                  <div
                    key={student.roll_number}
                    onClick={() => onSelectSingleTargetMover(student.roll_number)}
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition ${
                      isSelected
                        ? 'bg-amber-100/80 border-amber-500 font-bold text-amber-900 ring-2 ring-amber-500/20'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <p className="font-extrabold text-slate-900">{student.full_name}</p>
                      <p className="text-slate-400 font-mono text-[11px]">{student.roll_number} &bull; {student.programme} Yr {student.year}</p>
                    </div>
                    <input
                      type="radio"
                      name="singleTargetMover"
                      checked={isSelected}
                      onChange={() => {}}
                      className="w-4 h-4 text-amber-600 focus:ring-amber-500 pointer-events-none"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* DOUBLE SWAP SELECTION */}
      {swapType === 'double' && (
        <div className="space-y-4">
          {/* Select 1 partner from source room */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Select 1 Roommate from Your Room to move with you:
            </label>
            <select
              value={doubleSourcePartner}
              onChange={(e) => onSelectDoubleSourcePartner(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="" disabled>-- Select moving roommate --</option>
              {sourceRoommates.map(s => (
                <option key={s.roll_number} value={s.roll_number}>
                  {s.full_name} ({s.roll_number}) &bull; {s.programme} Yr {s.year}
                </option>
              ))}
            </select>
          </div>

          {/* Select 2 students from target room */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">
                Select 2 Students from Room {selectedRoom?.room_number}:
              </label>
              <span className="text-[11px] font-bold text-amber-700">
                {doubleTargetMovers.length}/2 Selected
              </span>
            </div>
            <div className="space-y-1.5">
              {targetStudents.map(student => {
                const isSelected = doubleTargetMovers.includes(student.roll_number);
                return (
                  <div
                    key={student.roll_number}
                    onClick={() => onToggleDoubleTargetMover(student.roll_number)}
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition ${
                      isSelected
                        ? 'bg-amber-100/80 border-amber-500 font-bold text-amber-900 ring-2 ring-amber-500/20'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <p className="font-extrabold text-slate-900">{student.full_name}</p>
                      <p className="text-slate-400 font-mono text-[11px]">{student.roll_number} &bull; {student.programme} Yr {student.year}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 pointer-events-none"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {!isValid() && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            {swapType === 'single' ? 'Please select 1 student from the target room.' : 'Please select 1 roommate and 2 students from the target room.'}
          </span>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!isValid()}
          className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next: Review Summary <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default SwapStepMovers;
