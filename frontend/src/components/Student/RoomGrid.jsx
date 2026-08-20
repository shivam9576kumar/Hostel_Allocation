import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import RoomCard from './RoomCard';
import PairCodeModal from './PairCodeModal';
import { getRooms } from '../../api/student';
import { toast } from 'react-hot-toast';

const RoomGrid = ({ floorId, rooms: initialRooms = [], onSelectRoom, onRefresh }) => {
  const [rooms, setRooms] = useState(initialRooms);
  const [loading, setLoading] = useState(false);
  const [showPairModal, setShowPairModal] = useState(false);
  const [selectedPendingRoom, setSelectedPendingRoom] = useState(null);

  // Sync initialRooms prop updates into local state when provided from parent
  useEffect(() => {
    if (initialRooms && initialRooms.length > 0) {
      setRooms(initialRooms);
      calculateStats(initialRooms);
    }
  }, [initialRooms]);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    vacant: 0,
    pending: 0,
    full: 0,
    reserved: 0,
  });

  const socket = useSocket();
  const hasJoinedRoom = useRef(false);

  // ========== FETCH ROOMS ==========
  const fetchRooms = async () => {
    if (!floorId) return;
    try {
      setLoading(true);
      const response = await getRooms(floorId);
      const roomData = response.data.rooms || [];
      setRooms(roomData);
      calculateStats(roomData);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
      toast.error('Failed to load rooms.');
    } finally {
      setLoading(false);
    }
  };

  // ========== CALCULATE STATS ==========
  const calculateStats = (roomList) => {
    const total = roomList.length;
    const vacant = roomList.filter((r) => r.status === 'Vacant').length;
    const pending = roomList.filter((r) => r.status === 'Pending_Pairing' || r.status === 'Pending').length;
    const full = roomList.filter((r) => r.status === 'Full' || r.status === 'Locked').length;
    const reserved = roomList.filter((r) => r.status === 'Reserved' || r.is_reserved).length;
    setStats({ total, vacant, pending, full, reserved });
  };

  // ========== HANDLE VACANT ROOM CLICK ==========
  const handleRoomSelect = (room) => {
    if (onSelectRoom) {
      onSelectRoom(room);
    } else {
      toast.success(`Room ${room.room_number} selected!`);
    }
  };

  // ========== HANDLE PENDING ROOM CLICK (JOIN PAIRING) ==========
  const handleJoinPending = (room) => {
    setSelectedPendingRoom(room);
    setShowPairModal(true);
  };

  // ========== INITIAL FETCH ==========
  useEffect(() => {
    if (floorId && (!initialRooms || initialRooms.length === 0)) {
      fetchRooms();
    } else if (initialRooms && initialRooms.length > 0) {
      calculateStats(initialRooms);
    }
  }, [floorId]);

  // ========== WEBSOCKET LISTENER ==========
  useEffect(() => {
    if (!socket) return;

    if (floorId && !hasJoinedRoom.current) {
      socket.emit('join-floor', floorId);
      hasJoinedRoom.current = true;
      console.log(`🟢 Joined floor channel: ${floorId}`);
    }

    const handleRoomUpdate = (data) => {
      console.log(`📡 Real-time update received:`, data);

      setRooms((prevRooms) => {
        const updatedRooms = prevRooms.map((room) => {
          const currentId = room.room_id || room.id;
          if (String(currentId) === String(data.roomId)) {
            return {
              ...room,
              status: data.status,
              current_occupancy: data.currentOccupancy ?? room.current_occupancy,
            };
          }
          return room;
        });

        // Update stats AFTER rooms are updated
        calculateStats(updatedRooms);
        return updatedRooms;
      });
    };

    socket.on('room-update', handleRoomUpdate);

    return () => {
      socket.off('room-update', handleRoomUpdate);
      if (floorId) {
        socket.emit('leave-floor', floorId);
        hasJoinedRoom.current = false;
        console.log(`🔴 Left floor channel: ${floorId}`);
      }
    };
  }, [socket, floorId]);

  // ========== RENDER ==========
  if (loading) {
    return <div className="p-4 text-center text-slate-500 font-medium">Loading rooms...</div>;
  }

  return (
    <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
      {/* Stats Bar */}
      <div className="flex flex-wrap gap-2 text-xs font-semibold pb-2 border-b border-slate-100">
        <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">Total: {stats.total}</span>
        <span className="px-3 py-1 bg-green-50 text-green-700 rounded-lg border border-green-200">Vacant: {stats.vacant}</span>
        <span className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded-lg border border-yellow-200">Pending: {stats.pending}</span>
        <span className="px-3 py-1 bg-red-50 text-red-700 rounded-lg border border-red-200">Full: {stats.full}</span>
        {stats.reserved > 0 && <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">Reserved: {stats.reserved}</span>}
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {rooms.map((room) => (
          <RoomCard
            key={room.room_id || room.id}
            room={room}
            onSelect={handleRoomSelect}          // ✅ For Vacant rooms
            onJoinPending={handleJoinPending}    // ✅ For Pending rooms
          />
        ))}
      </div>

      {/* Pair Code Modal */}
      {showPairModal && selectedPendingRoom && (
        <PairCodeModal
          room={selectedPendingRoom}
          onClose={() => {
            setShowPairModal(false);
            setSelectedPendingRoom(null);
          }}
          onSuccess={() => {
            fetchRooms();
            if (onRefresh) onRefresh();
            toast.success('Room joined successfully!');
          }}
        />
      )}
    </div>
  );
};

export default RoomGrid;
