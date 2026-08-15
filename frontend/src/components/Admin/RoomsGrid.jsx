import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, Layers, Grid, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import Breadcrumb from './Breadcrumb';
import RoomsStatsBar from './RoomsStatsBar';
import AddRoomsForm from './AddRoomsForm';
import SearchAndFilterBar from './SearchAndFilterBar';
import BulkActionsBar from './BulkActionsBar';
import RoomGridContainer from './RoomGridContainer';
import RoomDetailModal from './RoomDetailModal';

const RoomsGrid = () => {
  const { hostelId, blockId, floorId } = useParams();
  const navigate = useNavigate();

  // State
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showReserved, setShowReserved] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [floorInfo, setFloorInfo] = useState(null);

  // Fetch rooms & floor info on mount or floorId change
  useEffect(() => {
    if (floorId) {
      fetchRooms();
      fetchFloorInfo();
    } else {
      setLoading(false);
    }
  }, [floorId]);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/rooms?floorId=${floorId}`);
      setRooms(res.data.rooms || []);
    } catch (err) {
      toast.error('Failed to fetch rooms for this floor');
    } finally {
      setLoading(false);
    }
  };

  const fetchFloorInfo = async () => {
    try {
      const res = await api.get(`/admin/floors/${floorId}`);
      setFloorInfo(res.data.floor);
    } catch (err) {
      console.error('Failed to fetch floor info');
    }
  };

  // Calculate stats strictly for rooms on this floor
  const stats = {
    total: rooms.length,
    vacant: rooms.filter(r => r.status === 'Vacant' && !r.is_reserved).length,
    pending: rooms.filter(r => r.status === 'Pending_Pairing' && !r.is_reserved).length,
    locked: rooms.filter(r => r.status === 'Locked' && !r.is_reserved).length,
    reserved: rooms.filter(r => r.is_reserved).length,
  };

  // Apply floor-level filters (search & status)
  useEffect(() => {
    let filtered = [...rooms];

    // Search by room number
    if (searchTerm) {
      filtered = filtered.filter(r =>
        String(r.room_number).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    // Show reserved toggle
    if (!showReserved) {
      filtered = filtered.filter(r => !r.is_reserved);
    }

    // Sort rooms numerically (1, 2, 3, 10, 101)
    filtered.sort((a, b) => parseInt(a.room_number, 10) - parseInt(b.room_number, 10));

    setFilteredRooms(filtered);
  }, [rooms, searchTerm, statusFilter, showReserved]);

  // Bulk actions
  const handleSelectAll = () => {
    if (selectedRooms.length === filteredRooms.length) {
      setSelectedRooms([]);
    } else {
      setSelectedRooms(filteredRooms.map(r => r.room_id));
    }
  };

  const handleToggleSelect = (roomId) => {
    setSelectedRooms(prev =>
      prev.includes(roomId)
        ? prev.filter(id => id !== roomId)
        : [...prev, roomId]
    );
  };

  const handleBulkReserve = async (isReserved) => {
    if (selectedRooms.length === 0) {
      toast.error('Select at least one room.');
      return;
    }
    try {
      await api.put('/admin/rooms/bulk-reserve', {
        roomIds: selectedRooms,
        is_reserved: isReserved
      });
      toast.success(`${selectedRooms.length} room(s) ${isReserved ? 'reserved' : 'unreserved'}`);
      setSelectedRooms([]);
      fetchRooms();
    } catch (err) {
      toast.error('Failed to update rooms');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRooms.length === 0) {
      toast.error('Select at least one room.');
      return;
    }
    if (!window.confirm(`Delete ${selectedRooms.length} rooms? This action cannot be undone.`)) return;
    try {
      await api.delete('/admin/rooms/bulk-delete', {
        data: { roomIds: selectedRooms }
      });
      toast.success(`${selectedRooms.length} room(s) deleted`);
      setSelectedRooms([]);
      fetchRooms();
    } catch (err) {
      toast.error('Failed to delete rooms');
    }
  };

  const goBack = () => {
    if (hostelId && blockId) {
      navigate(`/admin/hostels/${hostelId}/blocks/${blockId}/floors`);
    } else {
      navigate(-1);
    }
  };

  const handleRoomClick = (roomId) => {
    setSelectedRoomId(roomId);
    setModalOpen(true);
  };

  // Extract metadata for breadcrumb display
  const hostelName = floorInfo?.Block?.Hostel?.name || 'Hostel';
  const blockName = floorInfo?.Block?.name || 'Block';
  const floorNumber = floorInfo?.floor_number;

  // Fallback if accessed without floorId parameter
  if (!floorId) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-4 shadow-sm max-w-xl mx-auto my-12">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-100">
            <Grid className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">Select a Floor to View Rooms</h2>
          <p className="text-sm text-slate-500">
            Rooms Grid is strictly floor-specific. Please navigate through Hostels $\rightarrow$ Blocks $\rightarrow$ Floors to select a floor.
          </p>
          <button
            onClick={() => navigate('/admin/hostels')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-sm transition shadow-md"
          >
            Go to Hostels Management
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Hierarchy */}
      <Breadcrumb
        hostelId={hostelId}
        blockId={blockId}
        floorId={floorId}
        hostelName={hostelName}
        blockName={blockName}
        floorNumber={floorNumber}
        onBack={goBack}
      />

      {/* Stats Bar for Floor */}
      <RoomsStatsBar stats={stats} />

      {/* Add Rooms Form for Floor */}
      <AddRoomsForm
        floorId={floorId}
        onSuccess={fetchRooms}
        floorNumber={floorNumber}
      />

      {/* Search & Filter Bar */}
      <SearchAndFilterBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        showReserved={showReserved}
        setShowReserved={setShowReserved}
      />

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedRooms.length}
        totalCount={filteredRooms.length}
        onSelectAll={handleSelectAll}
        allSelected={selectedRooms.length === filteredRooms.length && filteredRooms.length > 0}
        onReserve={() => handleBulkReserve(true)}
        onUnreserve={() => handleBulkReserve(false)}
        onDelete={handleBulkDelete}
      />

      {/* Card-Based Room Grid */}
      <RoomGridContainer
        rooms={filteredRooms}
        loading={loading}
        selectedRooms={selectedRooms}
        onToggleSelect={handleToggleSelect}
        onRoomClick={handleRoomClick}
        onRefresh={fetchRooms}
      />

      {/* Room Detail Modal */}
      <RoomDetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        roomId={selectedRoomId}
        onRefresh={fetchRooms}
      />
    </div>
  );
};

export default RoomsGrid;
