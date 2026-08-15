import React, { useState, useEffect } from 'react';
import { X, Users, Trash2, CheckSquare, Square, AlertTriangle, Loader2, UserMinus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const ManageOccupantsModal = ({ room, onClose, onSuccess }) => {
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [occupantsList, setOccupantsList] = useState([]);

  const roomId = room?.room_id || room?.id || room?.roomId;
  const floorId = room?.floor_id || room?.floorId || room?.Floor?.floor_id;

  useEffect(() => {
    if (!room) return;

    // 1. Initial occupants from prop
    const initial = room.Students || room.occupants || room.students || [];
    setOccupantsList(initial);

    // 2. If room has occupancy but students array is empty, fetch fresh details
    if (initial.length === 0 && (room.current_occupancy > 0 || room.occupancy > 0) && floorId) {
      api.get('/admin/rooms', { params: { floorId } })
        .then((res) => {
          const matchingRoom = (res.data.rooms || []).find(
            (r) => (r.room_id || r.id || r.roomId) === roomId
          );
          if (matchingRoom && (matchingRoom.Students || matchingRoom.occupants || matchingRoom.students)) {
            setOccupantsList(matchingRoom.Students || matchingRoom.occupants || matchingRoom.students || []);
          }
        })
        .catch((err) => console.error('Failed to fetch fresh room occupants:', err));
    }
  }, [room, roomId, floorId]);

  if (!room) return null;

  const occupants = occupantsList;
  const hostelName = room.Floor?.Block?.Hostel?.name || room.hostel_name || 'Hostel';
  const blockName = room.Floor?.Block?.name || room.block_name || 'Block';
  const floorNumber = room.Floor?.floor_number ?? room.floor_number ?? '1';

  const toggleStudent = (roll) => {
    setSelectedStudents((prev) =>
      prev.includes(roll) ? prev.filter((r) => r !== roll) : [...prev, roll]
    );
  };

  const toggleAll = () => {
    if (selectedStudents.length === occupants.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(occupants.map((s) => s.roll_number));
    }
  };

  const handleRemoveSelected = async () => {
    console.log('Room ID being sent:', roomId);

    if (!roomId) {
      toast.error('Invalid room ID. Please refresh the page and try again.');
      return;
    }
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student to release.');
      return;
    }
    if (!window.confirm(`Release ${selectedStudents.length} student(s) from Room ${room.room_number}?`)) return;

    setLoading(true);
    try {
      const response = await api.post(`/admin/rooms/${roomId}/release`, {
        studentRolls: selectedStudents,
        clearAll: false
      });

      if (response.data && (response.data.success === true || response.status === 200)) {
        toast.success(response.data.message || `Released ${selectedStudents.length} student(s) successfully.`);
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.error(response.data?.error || 'Failed to release students. Please try again.');
      }
    } catch (error) {
      console.error('Release error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to release students.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    console.log('Room ID being sent:', roomId);

    if (!roomId) {
      toast.error('Invalid room ID. Please refresh the page and try again.');
      return;
    }
    if (!window.confirm(`Release ALL ${occupants.length || room.current_occupancy} students from this room? This cannot be undone.`)) return;

    setLoading(true);
    try {
      const response = await api.post(`/admin/rooms/${roomId}/release`, {
        studentRolls: [],
        clearAll: true
      });

      if (response.data && (response.data.success === true || response.status === 200)) {
        toast.success(response.data.message || 'Room cleared successfully.');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.error(response.data?.error || 'Failed to clear room. Please try again.');
      }
    } catch (error) {
      console.error('Clear room error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to clear room. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 relative">
        <div className="p-6 md:p-8 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Manage Room Occupants</h3>
                  <span className="text-xs font-semibold text-slate-500">
                    Room {room.room_number} • {hostelName} | {blockName} | Floor {floorNumber} (ID: #{roomId})
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Occupancy Summary */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500 block">Current Occupancy</span>
              <span className="text-base font-extrabold text-slate-900">
                {room.current_occupancy} / {room.capacity || 2} Students
              </span>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                room.status === 'Vacant'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : room.status === 'Pending_Pairing'
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'bg-rose-100 text-rose-800 border border-rose-200'
              }`}
            >
              {room.status?.replace('_', ' ')}
            </span>
          </div>

          {/* Occupant Selection List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Current Occupants ({occupants.length})
              </span>
              {occupants.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs font-semibold text-amber-700 hover:text-amber-800 transition"
                >
                  {selectedStudents.length === occupants.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {occupants.map((student) => {
                const isSelected = selectedStudents.includes(student.roll_number);
                return (
                  <div
                    key={student.roll_number}
                    onClick={() => toggleStudent(student.roll_number)}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50/70 border-amber-400 shadow-sm'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-amber-600">
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-amber-600" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-300" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{student.full_name}</p>
                        <p className="text-xs text-slate-500 font-mono">
                          {student.roll_number} • {student.programme} ({student.gender})
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                        isSelected
                          ? 'bg-amber-200/80 text-amber-900'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isSelected ? 'Marked to Release' : 'Occupant'}
                    </span>
                  </div>
                );
              })}

              {occupants.length === 0 && (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 text-xs font-medium">
                  No occupants currently assigned to this room.
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleRemoveSelected}
              disabled={loading || selectedStudents.length === 0}
              className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserMinus className="w-4 h-4" />
              )}
              Release Selected ({selectedStudents.length})
            </button>

            <button
              type="button"
              onClick={handleClearAll}
              disabled={loading || (occupants.length === 0 && room.current_occupancy === 0)}
              className="py-3 px-4 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              Clear Entire Room
            </button>
          </div>

          {/* Information Notice */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl text-[11px] text-amber-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              Impact of Releasing Occupant(s):
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-amber-800 text-[11px] pl-1">
              <li>Student status is reset to <strong>'Pending'</strong> with room assignment removed.</li>
              <li>Booking records are cleared and old allocation PDFs are invalidated.</li>
              <li>Room occupancy is decremented (set to <strong>'Vacant'</strong> if all are released).</li>
            </ul>
          </div>

          {/* Cancel */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition text-center"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageOccupantsModal;
