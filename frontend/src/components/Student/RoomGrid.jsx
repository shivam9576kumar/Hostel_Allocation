import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import PairCodeModal from './PairCodeModal';
import { pairRoom, pairByCode } from '../../api/student';

const RoomGrid = React.memo(({ rooms: initialRooms = [], floorId: propFloorId, onSelectRoom, onRefresh }) => {
  const [localRooms, setLocalRooms] = useState(initialRooms);
  const [showPairModal, setShowPairModal] = useState(false);
  const [selectedPendingRoom, setSelectedPendingRoom] = useState(null);
  const socket = useSocket();
  const activeFloorRef = useRef(null);

  // Sync initialRooms prop updates to local state
  useEffect(() => {
    setLocalRooms(initialRooms);
  }, [initialRooms]);

  // Determine current floorId
  const floorId = propFloorId || (localRooms.length > 0 ? localRooms[0].floor_id : null);

  // Compute live statistics from localRooms state
  const calculateStats = (roomList) => {
    const total = roomList.length;
    const vacant = roomList.filter(r => r.status === 'Vacant').length;
    const pending = roomList.filter(r => r.status === 'Pending_Pairing' || r.status === 'Pending').length;
    const full = roomList.filter(r => r.status === 'Full' || r.status === 'Locked').length;
    const reserved = roomList.filter(r => r.is_reserved || r.status === 'Reserved').length;
    return { total, vacant, pending, full, reserved };
  };

  const stats = calculateStats(localRooms);

  // Real-time WebSocket floor subscription listener
  useEffect(() => {
    if (!socket || !floorId) return;

    const floorChannelId = String(floorId);

    // Join room-specific floor channel
    socket.emit('join-floor', floorChannelId);
    activeFloorRef.current = floorChannelId;
    console.log(`🟢 Joined floor channel: ${floorChannelId}`);

    // Handle incoming room update from backend
    const handleRoomUpdate = (data) => {
      console.log(`📡 Real-time room update received:`, data);
      setLocalRooms((prevRooms) => {
        return prevRooms.map((room) => {
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
      });
    };

    socket.on('room-update', handleRoomUpdate);

    // Cleanup: Leave channel on floor change or unmount
    return () => {
      socket.off('room-update', handleRoomUpdate);
      if (activeFloorRef.current) {
        socket.emit('leave-floor', activeFloorRef.current);
        console.log(`🔴 Left floor channel: ${activeFloorRef.current}`);
        activeFloorRef.current = null;
      }
    };
  }, [socket, floorId]);

  if (!localRooms || localRooms.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-600">No Available Rooms Found</h3>
        <p className="text-xs text-slate-400 mt-1">Select a floor from above to view the room grid.</p>
      </div>
    );
  }

  const visibleRooms = localRooms.filter(r => !r.is_reserved);

  const handleJoinPending = (room) => {
    setSelectedPendingRoom(room);
    setShowPairModal(true);
  };

  const handleSubmitPairCode = async (code) => {
    const roomId = selectedPendingRoom?.room_id || selectedPendingRoom?.id;
    if (roomId) {
      await pairRoom(roomId, code);
    } else {
      await pairByCode(code);
    }
    setShowPairModal(false);
    setSelectedPendingRoom(null);
    if (onRefresh) onRefresh();
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
      {/* Header & Instant Stats Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Floor Room Availability Grid
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Click green room to book, yellow room to enter pairing code
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold flex-wrap">
          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
            Total: {stats.total}
          </span>
          <span className="px-2.5 py-1 bg-green-50 text-green-700 rounded-lg border border-green-200">
            Vacant: {stats.vacant}
          </span>
          <span className="px-2.5 py-1 bg-yellow-50 text-yellow-700 rounded-lg border border-yellow-200">
            Pending: {stats.pending}
          </span>
          <span className="px-2.5 py-1 bg-red-50 text-red-700 rounded-lg border border-red-200">
            Full: {stats.full}
          </span>
        </div>
      </div>

      {/* Grid of Rooms */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {visibleRooms.map((room) => {
          const isVacant = room.status === 'Vacant';
          const isPending = room.status === 'Pending_Pairing' || room.status === 'Pending';
          const isLocked = room.status === 'Locked' || room.status === 'Full';

          let bgColor = 'bg-slate-50';
          let textColor = 'text-slate-600';
          let borderColor = 'border-slate-200';
          let hoverClass = '';
          let disabledClass = 'cursor-default';

          if (isVacant) {
            bgColor = 'bg-green-50';
            textColor = 'text-green-800';
            borderColor = 'border-green-300';
            hoverClass = 'hover:border-green-500 hover:shadow-md';
            disabledClass = 'cursor-pointer';
          } else if (isPending) {
            bgColor = 'bg-yellow-50';
            textColor = 'text-yellow-800';
            borderColor = 'border-yellow-300';
            hoverClass = 'hover:border-yellow-500 hover:shadow-md';
            disabledClass = 'cursor-pointer';
          } else if (isLocked) {
            bgColor = 'bg-red-50';
            textColor = 'text-red-800';
            borderColor = 'border-red-300';
            disabledClass = 'cursor-not-allowed';
          }

          return (
            <div
              key={room.room_id || room.id}
              onClick={() => {
                if (isVacant && onSelectRoom) onSelectRoom(room);
                else if (isPending) handleJoinPending(room);
              }}
              className={`relative flex items-center justify-center h-20 rounded-xl border-2 ${bgColor} ${borderColor} ${textColor} font-bold text-lg ${hoverClass} ${disabledClass} transition select-none`}
            >
              {room.room_number}

              {isPending && (
                <span className="absolute top-1.5 right-1.5 text-[10px] bg-yellow-200 text-yellow-900 font-semibold px-1.5 py-0.5 rounded-full animate-pulse">
                  Waiting
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Grid Footer Legend */}
      <div className="pt-2 text-xs text-slate-400 font-medium flex items-center justify-between flex-wrap gap-2 border-t border-slate-100">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1.5">🟢 Vacant</span>
          <span className="flex items-center gap-1.5">🟡 Pending (Click to Join)</span>
          <span className="flex items-center gap-1.5">🔴 Full / Locked</span>
        </div>
        <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
          ⚡ Real-time updates enabled
        </span>
      </div>

      {/* Pair Code Modal */}
      {showPairModal && selectedPendingRoom && (
        <PairCodeModal
          room={selectedPendingRoom}
          onClose={() => {
            setShowPairModal(false);
            setSelectedPendingRoom(null);
          }}
          onSubmitPairCode={handleSubmitPairCode}
        />
      )}
    </div>
  );
});

export default RoomGrid;
