// frontend/src/components/Admin/AssignRoomModal.jsx

import React, { useState, useEffect } from 'react';
import { X, Home, Layers, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAvailableRooms, assignRoom } from '../../api/students';

const formatRoomNumber = (num) => {
  if (num === undefined || num === null) return '';
  return String(num).padStart(3, '0');
};

const AssignRoomModal = ({ student, onClose, onSuccess }) => {
  const [hostels, setHostels] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedHostel, setSelectedHostel] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchAvailableRooms();
  }, []);

  const fetchAvailableRooms = async () => {
    setFetching(true);
    try {
      const res = await getAvailableRooms(student.roll_number);
      setHostels(res.data.hostels || []);
    } catch (err) {
      toast.error('Failed to load available rooms');
    } finally {
      setFetching(false);
    }
  };

  const handleHostelSelect = (hostelId) => {
    const hostel = hostels.find(h => h.hostel_id === hostelId);
    setSelectedHostel(hostel);
    setBlocks(hostel?.Blocks || []);
    setSelectedBlock(null);
    setSelectedFloor(null);
    setRooms([]);
    setSelectedRoom(null);
  };

  const handleBlockSelect = (blockId) => {
    const block = blocks.find(b => b.block_id === blockId);
    setSelectedBlock(block);
    setFloors(block?.Floors || []);
    setSelectedFloor(null);
    setRooms([]);
    setSelectedRoom(null);
  };

  const handleFloorSelect = (floorId) => {
    const floor = floors.find(f => f.floor_id === floorId);
    setSelectedFloor(floor);
    setRooms(floor?.Rooms || []);
    setSelectedRoom(null);
  };

  const handleAssign = async () => {
    if (!selectedRoom) {
      toast.error('Please select a room.');
      return;
    }

    if (student.booked_room_id && !window.confirm(`Student already assigned to Room ${student.BookedRoom?.room_number || student.booked_room_id}. Reassign to Room ${formatRoomNumber(selectedRoom.room_number)}?`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await assignRoom(student.roll_number, selectedRoom.room_id);
      toast.success(res.data.message);
      if (onSuccess) onSuccess(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto p-6 shadow-2xl border border-slate-200" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Home className="w-5 h-5 text-blue-600" />
            Assign Room
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Student Summary Card */}
        <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 mb-5 text-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-slate-900">{student.full_name} ({student.roll_number})</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
              {student.gender}
            </span>
          </div>
          <p className="text-slate-600 text-xs font-semibold">
            {student.programme} &bull; Year {student.year} &bull; Dept: {student.department || 'N/A'}
          </p>
          <p className="text-xs font-bold text-slate-700 pt-1">
            Current Room: <span className={student.BookedRoom?.room_number ? 'text-emerald-600 font-extrabold' : 'text-slate-400'}>
              {student.BookedRoom?.room_number ? formatRoomNumber(student.BookedRoom.room_number) : 'Unassigned'}
            </span>
          </p>
        </div>

        {/* Reassignment Warning */}
        {student.booked_room_id && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <span>This student is already assigned to a room. Assigning a new room will free their current spot and move them to the selected room.</span>
          </div>
        )}

        {/* Cascading Selection */}
        {fetching ? (
          <div className="py-8 text-center text-slate-400 font-semibold animate-pulse">
            Loading eligible hostels & rooms...
          </div>
        ) : hostels.length === 0 ? (
          <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-6 text-center text-slate-500 text-sm font-semibold">
            No eligible available rooms found matching this student's gender, programme, and allocation rules.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Hostel Dropdown */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Select Hostel</label>
              <select
                value={selectedHostel?.hostel_id || ''}
                onChange={(e) => handleHostelSelect(Number(e.target.value))}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Choose Hostel --</option>
                {hostels.map(h => (
                  <option key={h.hostel_id} value={h.hostel_id}>{h.name} ({h.allowed_gender})</option>
                ))}
              </select>
            </div>

            {/* Block Dropdown */}
            {selectedHostel && (
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Select Block</label>
                <select
                  value={selectedBlock?.block_id || ''}
                  onChange={(e) => handleBlockSelect(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Choose Block --</option>
                  {blocks.map(b => (
                    <option key={b.block_id} value={b.block_id}>Block {b.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Floor Dropdown */}
            {selectedBlock && (
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Select Floor</label>
                <select
                  value={selectedFloor?.floor_id || ''}
                  onChange={(e) => handleFloorSelect(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Choose Floor --</option>
                  {floors.map(f => (
                    <option key={f.floor_id} value={f.floor_id}>
                      Floor {f.floor_number} {f.floor_number === 0 ? '(Ground)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Room Grid Selection */}
            {selectedFloor && (
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-2">Select Available Room</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
                  {rooms.map(room => {
                    const isFull = room.current_occupancy >= room.capacity;
                    const isSelected = selectedRoom?.room_id === room.room_id;
                    return (
                      <div
                        key={room.room_id}
                        onClick={() => !isFull && setSelectedRoom(room)}
                        className={`p-3 rounded-xl border-2 text-center transition cursor-pointer ${
                          isFull
                            ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
                            : isSelected
                            ? 'border-blue-600 bg-blue-50/80 shadow-md ring-2 ring-blue-500/20'
                            : 'border-slate-200 hover:border-blue-300 bg-white'
                        }`}
                      >
                        <p className="font-extrabold text-base text-slate-900">{formatRoomNumber(room.room_number)}</p>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">
                          {room.current_occupancy}/{room.capacity} Occupied
                        </p>
                        <div className="mt-1">
                          {room.status === 'Vacant' && <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">🟢 Vacant</span>}
                          {room.status === 'Pending_Pairing' && <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">🟡 Pending</span>}
                        </div>
                      </div>
                    );
                  })}
                  {rooms.length === 0 && (
                    <p className="text-xs font-semibold text-slate-400 col-span-full text-center py-4">No available rooms on this floor.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6 pt-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedRoom || loading}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition disabled:opacity-50 shadow-sm"
          >
            {loading ? 'Assigning...' : 'Assign Student'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignRoomModal;
