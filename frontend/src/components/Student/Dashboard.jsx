import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  getDashboard, 
  getBlocks, 
  getFloors, 
  getRooms, 
  bookRoom, 
  pairRoom 
} from '../../api/student';
import HostelList from './HostelList';
import BlockList from './BlockList';
import FloorList from './FloorList';
import RoomGrid from './RoomGrid';
import BookingModal from './BookingModal';
import PairCodeModal from './PairCodeModal';
import PairCodeEntry from './PairCodeEntry';
import RoomStatusCard from './RoomStatusCard';
import toast from 'react-hot-toast';
import { LogOut, User, Building2, CheckCircle, ShieldAlert, ArrowLeft, RefreshCw } from 'lucide-react';

const Dashboard = () => {
  const { user, logout, updateUser } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cascading Selection States
  const [hostels, setHostels] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [selectedHostel, setSelectedHostel] = useState('');
  const [selectedBlock, setSelectedBlock] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');

  // Modal States
  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState(null);
  const [selectedRoomForPairing, setSelectedRoomForPairing] = useState(null);
  const [bookingResult, setBookingResult] = useState(null);

  // Fetch Dashboard details & eligible hostels
  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDashboard();
      setDashboardData(res.data);
      if (res.data.student) {
        updateUser(res.data.student);
      }
      if (res.data.eligibleHostels) {
        setHostels(res.data.eligibleHostels);
      }
    } catch (err) {
      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        const netErrMsg = 'Cannot connect to server. Please ensure the backend is running on http://localhost:5000.';
        setError(netErrMsg);
        toast.error(netErrMsg);
      } else {
        const errMsg = err.response?.data?.error || 'Failed to load dashboard data.';
        setError(errMsg);
        toast.error(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // Handle Hostel Selection -> Fetch Blocks
  const handleSelectHostel = async (hostelId) => {
    setSelectedHostel(hostelId);
    setSelectedBlock('');
    setSelectedFloor('');
    setBlocks([]);
    setFloors([]);
    setRooms([]);
    setError(null);

    if (!hostelId) return;

    try {
      const res = await getBlocks(hostelId);
      setBlocks(res.data.blocks || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load blocks for selected hostel.');
    }
  };

  // Handle Block Selection -> Fetch Floors
  const handleSelectBlock = async (blockId) => {
    setSelectedBlock(blockId);
    setSelectedFloor('');
    setFloors([]);
    setRooms([]);
    setError(null);

    if (!blockId) return;

    try {
      const res = await getFloors(blockId);
      setFloors(res.data.floors || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load floors for selected block.');
    }
  };

  // Handle Floor Selection -> Fetch Rooms
  const handleSelectFloor = async (floorId) => {
    setSelectedFloor(floorId);
    setRooms([]);
    setError(null);

    if (!floorId) return;

    try {
      const res = await getRooms(floorId);
      setRooms(res.data.rooms || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load rooms for selected floor.');
    }
  };

  // Reset Selection
  const handleReset = () => {
    setSelectedHostel('');
    setSelectedBlock('');
    setSelectedFloor('');
    setBlocks([]);
    setFloors([]);
    setRooms([]);
    setError(null);
  };

  // Handle Room Click from Grid
  const handleRoomClick = (room) => {
    if (room.is_reserved) return;

    if (room.status === 'Vacant') {
      setSelectedRoomForBooking(room);
      setBookingResult(null);
    } else if (room.status === 'Pending_Pairing') {
      setSelectedRoomForPairing(room);
    } else if (room.status === 'Locked') {
      toast.error('Room is already locked and fully occupied.');
    }
  };

  // Primary Booking API Call
  const handleConfirmPrimaryBooking = async () => {
    if (!selectedRoomForBooking) return;
    try {
      const res = await bookRoom(selectedRoomForBooking.room_id);
      setSelectedRoomForBooking(null);
      setBookingResult(null);
      toast.success(res.data?.message || 'Room booked successfully!');
      await fetchDashboard();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to book room.');
    }
  };

  // Secondary Pairing API Call
  const handleSubmitPairCode = async (code) => {
    if (!selectedRoomForPairing) return;
    try {
      const res = await pairRoom(selectedRoomForPairing.room_id, code);
      setSelectedRoomForPairing(null);
      toast.success(res.data?.message || 'Joined room successfully!');
      await fetchDashboard();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Pairing failed.');
      throw err;
    }
  };

  const selectedHostelObj = hostels.find(h => String(h.hostel_id) === String(selectedHostel));
  const selectedBlockObj = blocks.find(b => String(b.block_id) === String(selectedBlock));
  const selectedFloorObj = floors.find(f => String(f.floor_id) === String(selectedFloor));

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-300">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm font-medium">Checking student booking status...</p>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-slate-100">
        <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-xl">
          <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Service Error</h2>
          <p className="text-sm text-slate-300">{error}</p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={fetchDashboard}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Retry Connection
            </button>
            <button
              onClick={logout}
              className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs rounded-xl transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* Header Bar */}
      <header className="bg-slate-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6 text-blue-400" />
            <span className="font-bold text-lg tracking-tight">IIT Hostel Booking Portal</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="text-sm font-semibold text-slate-200 block">{user?.full_name}</span>
              <span className="text-xs text-slate-400 font-mono">{user?.roll_number} ({user?.programme} Yr {user?.year})</span>
            </div>
            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Student Portal Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* User Profile & Eligibility Banner */}
        <div className="space-y-3">
          <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xl shrink-0 border border-blue-200">
              {user?.full_name?.charAt(0) || 'S'}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{user?.full_name}</h1>
              <p className="text-sm text-slate-500">Roll: {user?.roll_number} | {user?.gender} | {user?.programme} - Year {user?.year}</p>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2">
            <span className="text-emerald-600 text-lg shrink-0">✅</span>
            <span className="text-sm text-emerald-800 font-medium">
              Eligibility Verification Passed – Matching active hostel time windows & program constraints.
            </span>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Active Booking Room Status Card OR Booking Selector */}
        {(dashboardData?.student?.booked_room_id || user?.booked_room_id) && (
          ['Pending_Pairing', 'Locked', 'Allocated'].includes(dashboardData?.student?.booking_status || user?.booking_status)
        ) ? (
          <RoomStatusCard
            room={dashboardData?.student?.BookedRoom || { room_id: dashboardData?.student?.booked_room_id || user?.booked_room_id }}
            user={dashboardData?.student || user}
            onPdfReady={() => window.location.href = '/pdf'}
            onNavigate={fetchDashboard}
          />
        ) : (
          <>
            {/* Instant Code Entry Shortcut */}
            <PairCodeEntry onPairSuccess={fetchDashboard} />

            {/* Selection Flow Container */}
            <div className="space-y-6">

              {/* 1. Hostels */}
              {!selectedHostel && (
                <HostelList
                  hostels={hostels}
                  onSelect={handleSelectHostel}
                  selectedHostel={selectedHostel}
                />
              )}

              {/* 2. Blocks */}
              {selectedHostel && !selectedBlock && (
                <BlockList
                  blocks={blocks}
                  onSelect={handleSelectBlock}
                  selectedBlock={selectedBlock}
                  hostelName={selectedHostelObj?.name || 'Hostel'}
                />
              )}

              {/* 3. Floors */}
              {selectedHostel && selectedBlock && !selectedFloor && (
                <FloorList
                  floors={floors}
                  onSelect={handleSelectFloor}
                  selectedFloor={selectedFloor}
                  hostelName={selectedHostelObj?.name || 'Hostel'}
                  blockName={selectedBlockObj?.name || 'Block'}
                />
              )}

              {/* 4. Rooms Grid */}
              {selectedHostel && selectedBlock && selectedFloor && (
                <div className="space-y-4">
                  {/* Breadcrumb Navigation Header */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-800 flex-wrap">
                      <span>🏠 {selectedHostelObj?.name || 'Hostel'}</span>
                      <span className="text-slate-400">→</span>
                      <span>{selectedBlockObj?.name || 'Block'}</span>
                      <span className="text-slate-400">→</span>
                      <span className="text-blue-600">Floor {selectedFloorObj?.floor_number ?? selectedFloor}</span>
                    </div>

                    <button
                      onClick={handleReset}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition shrink-0"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Reset Choices
                    </button>
                  </div>

                  <RoomGrid
                    rooms={rooms}
                    onSelectRoom={handleRoomClick}
                  />
                </div>
              )}

              {/* Back / Reset Navigation Button */}
              {selectedHostel && (
                <div className="pt-2 flex items-center justify-between">
                  <button
                    onClick={() => {
                      if (selectedFloor) {
                        setSelectedFloor('');
                        setRooms([]);
                      } else if (selectedBlock) {
                        setSelectedBlock('');
                        setFloors([]);
                      } else if (selectedHostel) {
                        setSelectedHostel('');
                        setBlocks([]);
                      }
                    }}
                    className="text-xs text-slate-600 hover:text-blue-600 font-semibold flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-slate-200 transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Previous Step
                  </button>

                  <button
                    onClick={handleReset}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium transition"
                  >
                    ← Reset Choices
                  </button>
                </div>
              )}
            </div>
          </>
        )}

      </main>

      {/* Booking Modal (Step 1) */}
      {selectedRoomForBooking && (
        <BookingModal
          room={selectedRoomForBooking}
          onClose={() => {
            setSelectedRoomForBooking(null);
            setBookingResult(null);
            if (selectedFloor) handleSelectFloor(selectedFloor);
          }}
          onConfirmBooking={handleConfirmPrimaryBooking}
          bookingResult={bookingResult}
        />
      )}

      {/* Pair Code Modal (Step 2) */}
      {selectedRoomForPairing && (
        <PairCodeModal
          room={selectedRoomForPairing}
          onClose={() => setSelectedRoomForPairing(null)}
          onSubmitPairCode={handleSubmitPairCode}
        />
      )}

    </div>
  );
};

export default Dashboard;