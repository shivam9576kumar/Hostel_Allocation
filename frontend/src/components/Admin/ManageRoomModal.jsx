// frontend/src/components/Admin/ManageRoomModal.jsx

import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus, Trash2, Search, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import ConfirmDialog from '../Common/ConfirmDialog';

const getCleanRoomId = (idProp) => {
  if (!idProp) return null;
  if (typeof idProp === 'object') {
    return idProp.room_id || idProp.roomId || idProp.id || null;
  }
  return idProp;
};

const ManageRoomModal = ({ roomId, onClose, onRefresh }) => {
  const cleanRoomId = getCleanRoomId(roomId);
  const [room, setRoom] = useState(null);
  const [occupants, setOccupants] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [showAddSection, setShowAddSection] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: 'warning',
    title: '',
    message: '',
    details: [],
    confirmLabel: 'Confirm',
    onConfirm: () => {},
  });

  useEffect(() => {
    if (!cleanRoomId) {
      toast.error('Invalid room ID.');
      onClose();
      return;
    }
    fetchRoomData();
  }, [cleanRoomId]);

  // Debounce search input
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        searchStudent();
      } else {
        setSearchResult(null);
        setSearchError('');
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const fetchRoomData = async () => {
    if (!cleanRoomId) return;
    try {
      const [roomRes, occRes] = await Promise.all([
        api.get(`/admin/rooms/${cleanRoomId}`),
        api.get(`/admin/rooms/${cleanRoomId}/occupants`),
      ]);
      setRoom(roomRes.data.room);
      setOccupants(occRes.data.occupants || []);
    } catch (err) {
      toast.error('Failed to load room data');
    }
  };

  const searchStudent = async () => {
    if (!searchQuery.trim() || !cleanRoomId) return;
    setIsSearching(true);
    setSearchError('');
    setSearchResult(null);
    try {
      const res = await api.get(`/admin/rooms/${cleanRoomId}/search-student?query=${encodeURIComponent(searchQuery.trim())}`);
      if (res.data.eligible) {
        setSearchResult(res.data.student);
      } else {
        setSearchError(res.data.message || 'Student not eligible.');
      }
    } catch (err) {
      setSearchError('Failed to search student.');
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSelect = (rollNumber) => {
    setSelectedStudents(prev =>
      prev.includes(rollNumber)
        ? prev.filter(r => r !== rollNumber)
        : [...prev, rollNumber]
    );
  };

  const toggleSelectAll = () => {
    if (selectedStudents.length === occupants.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(occupants.map(s => s.roll_number));
    }
  };

  const handleRemoveSelected = () => {
    if (selectedStudents.length === 0) {
      toast.error('Select at least one student to remove.');
      return;
    }
    if (!cleanRoomId) {
      toast.error('Error: Room ID not found. Please refresh and try again.');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      type: 'warning',
      title: 'Remove Selected Students',
      message: `Are you sure you want to remove ${selectedStudents.length} student(s) from Room ${room?.room_number}?`,
      details: [
        `Selected students: ${selectedStudents.join(', ')}`,
        'Their booking status will be reset to "Pending"',
        'The room capacity will be freed up',
      ],
      confirmLabel: 'Remove Selected',
      onConfirm: async () => {
        setLoading(true);
        try {
          await api.post(`/admin/rooms/${cleanRoomId}/release`, {
            studentRolls: selectedStudents,
            clearAll: false,
          });
          toast.success(`${selectedStudents.length} student(s) removed.`);
          setSelectedStudents([]);
          fetchRoomData();
          if (searchQuery.trim().length >= 2) searchStudent();
          if (onRefresh) onRefresh();
        } catch (err) {
          toast.error(err.response?.data?.error || 'Failed to remove students');
        } finally {
          setLoading(false);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleClearAll = () => {
    if (!cleanRoomId) {
      toast.error('Error: Room ID not found. Please refresh and try again.');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      type: 'danger',
      title: 'Clear Entire Room',
      message: `Are you sure you want to remove ALL occupants from Room ${room?.room_number}?`,
      details: [
        '⚠️ All current occupants will be removed from this room',
        'All student booking statuses will be reset to "Pending"',
        'The room occupancy will be reset to 0',
      ],
      confirmLabel: 'Clear All Occupants',
      onConfirm: async () => {
        setLoading(true);
        try {
          await api.post(`/admin/rooms/${cleanRoomId}/release`, {
            studentRolls: [],
            clearAll: true,
          });
          toast.success(`Room ${room?.room_number} cleared successfully.`);
          setSelectedStudents([]);
          fetchRoomData();
          if (searchQuery.trim().length >= 2) searchStudent();
          if (onRefresh) onRefresh();
        } catch (err) {
          toast.error(err.response?.data?.error || 'Failed to clear room');
        } finally {
          setLoading(false);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleAddStudent = async () => {
    if (!searchResult || !cleanRoomId) return;
    setLoading(true);
    try {
      const res = await api.post(`/admin/rooms/${cleanRoomId}/assign-student`, {
        rollNumber: searchResult.roll_number,
      });
      toast.success(res.data.message || `${searchResult.full_name} assigned successfully.`);
      setSearchQuery('');
      setSearchResult(null);
      setSearchError('');
      setShowAddSection(false);
      fetchRoomData();
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign student');
    } finally {
      setLoading(false);
    }
  };

  if (!room) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 text-slate-400 font-semibold">Loading room data...</div>
      </div>
    );
  }

  const isFull = room.current_occupancy >= room.capacity;
  const hasSpace = !isFull;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto p-6 shadow-2xl space-y-5" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Manage Room {String(room.room_number).padStart(3, '0')}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-500">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Room Info Bar */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-semibold text-slate-600">
              <div>
                <span className="text-slate-400 font-normal block">Hostel</span>
                <span className="text-slate-800 font-bold text-sm">{room.Floor?.Block?.Hostel?.name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-normal block">Block</span>
                <span className="text-slate-800 font-bold text-sm">{room.Floor?.Block?.name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-normal block">Floor</span>
                <span className="text-slate-800 font-bold text-sm">Floor {room.Floor?.floor_number ?? 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-normal block">Occupancy Status</span>
                <span className={`inline-flex items-center gap-1 mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold ${isFull ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  {room.current_occupancy}/{room.capacity} {isFull ? '🔒 FULL' : '🟢 SPACE AVAILABLE'}
                </span>
              </div>
            </div>
          </div>

          {/* Occupants List Header */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Current Occupants</h3>
                <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded-full">{occupants.length} / {room.capacity}</span>
              </div>
              {occupants.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 transition"
                >
                  {selectedStudents.length === occupants.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            {occupants.length === 0 ? (
              <div className="text-center text-sm font-medium text-slate-400 py-8 border-2 border-dashed border-slate-200 rounded-xl">
                No occupants currently assigned to this room.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2.5 bg-white">
                {occupants.map(student => (
                  <div
                    key={student.roll_number}
                    onClick={() => toggleSelect(student.roll_number)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                      selectedStudents.includes(student.roll_number)
                        ? 'bg-blue-50 border-blue-300'
                        : 'border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.roll_number)}
                        onChange={() => toggleSelect(student.roll_number)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div>
                        <p className="text-sm font-extrabold text-slate-900">{student.full_name}</p>
                        <p className="text-xs text-slate-400 font-mono">
                          {student.roll_number} &bull; {student.programme} Yr {student.year} {student.department ? `(${student.department})` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg font-bold">
                      {student.booking_status || 'Assigned'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={handleRemoveSelected}
              disabled={selectedStudents.length === 0 || loading}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-sm"
            >
              Remove Selected ({selectedStudents.length})
            </button>
            <button
              onClick={handleClearAll}
              disabled={occupants.length === 0 || loading}
              className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition border border-rose-200 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" /> Clear All Occupants
            </button>
          </div>

          {/* Search-Based Add Student Section */}
          {hasSpace && (
            <div className="pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowAddSection(!showAddSection)}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 transition"
              >
                <UserPlus className="w-4 h-4" /> {showAddSection ? 'Hide Search Form' : '+ Add Student to Room'}
              </button>

              {showAddSection && (
                <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Search Student by Roll Number or Email:
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="e.g. 2024CE00534 or student@iit.ac.in"
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium mt-1">
                      Type at least 2 characters to search and validate eligibility in real-time.
                    </p>
                  </div>

                  {isSearching && (
                    <div className="p-3 bg-blue-50 text-blue-700 rounded-xl text-xs font-semibold animate-pulse flex items-center gap-2">
                      <Search className="w-4 h-4 animate-spin" /> Searching & validating eligibility...
                    </div>
                  )}

                  {searchError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs font-semibold text-rose-700">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>{searchError}</span>
                    </div>
                  )}

                  {searchResult && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div>
                          <p className="text-xs font-extrabold text-emerald-900">{searchResult.full_name}</p>
                          <p className="text-[11px] text-emerald-700 font-medium">
                            {searchResult.roll_number} &bull; {searchResult.programme} Yr {searchResult.year} ({searchResult.gender})
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddStudent}
                        disabled={loading}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shrink-0 shadow-sm"
                      >
                        {loading ? 'Adding...' : 'Add Student'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Close Button */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        type={confirmDialog.type}
        title={confirmDialog.title}
        message={confirmDialog.message}
        details={confirmDialog.details}
        confirmLabel={confirmDialog.confirmLabel}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </>
  );
};

export default ManageRoomModal;
