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
import CascadingDropdown from './CascadingDropdown';
import RoomGrid from './RoomGrid';
import BookingModal from './BookingModal';
import PairCodeModal from './PairCodeModal';
import PairCodeEntry from './PairCodeEntry';
import PDFView from './PDFView';
import { LogOut, User, Building2, CheckCircle, ShieldAlert } from 'lucide-react';

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
      setError(err.response?.data?.error || 'Failed to load dashboard data.');
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

  // Reset Cascading Choices
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
      alert(`Room ${room.room_number} is already locked and fully occupied.`);
    }
  };

  // Primary Booking API Call (Step 1)
  const handleConfirmPrimaryBooking = async () => {
    if (!selectedRoomForBooking) return;
    try {
      const res = await bookRoom(selectedRoomForBooking.room_id);
      setBookingResult(res.data);
      // Refresh room list
      if (selectedFloor) handleSelectFloor(selectedFloor);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to book room.');
    }
  };

  // Secondary Pairing API Call (Step 2)
  const handleSubmitPairCode = async (code) => {
    if (!selectedRoomForPairing) return;
    try {
      await pairRoom(selectedRoomForPairing.room_id, code);
      setSelectedRoomForPairing(null);
      // Refresh dashboard to trigger PDF redirect
      await fetchDashboard();
    } catch (err) {
      throw new Error(err.response?.data?.error || 'Pairing failed.');
    }
  };

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

  // Redirect to PDFView if student booking status is Locked
  if (dashboardData?.redirectToPdf || user?.booking_status === 'Locked') {
    return <PDFView student={user} onLogout={logout} forceRefresh={true} />;
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Profile & Eligibility Summary Banner */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100 shrink-0">
              <User className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{user?.full_name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-600 font-medium">
                <span className="bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">Roll: {user?.roll_number}</span>
                <span className="bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">Gender: {user?.gender}</span>
                <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-200 font-semibold">{user?.programme} - Year {user?.year}</span>
              </div>
            </div>
          </div>

          {/* DYNAMIC ELIGIBILITY BANNER */}
          {hostels.length > 0 ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-xs text-emerald-900">
                <span className="font-bold block">Eligibility Verification Passed</span>
                <span>Matching active hostel time windows & program constraints.</span>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
              <div className="text-xs text-amber-900">
                <span className="font-bold block">No Eligible Hostels Found</span>
                <span>You do not match any active hostel eligibility requirements.</span>
              </div>
            </div>
          )}
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Instant Code Entry Shortcut */}
        <PairCodeEntry onPairSuccess={fetchDashboard} />

        {/* Cascading Dropdown Selector */}
        <CascadingDropdown
          hostels={hostels}
          blocks={blocks}
          floors={floors}
          selectedHostel={selectedHostel}
          selectedBlock={selectedBlock}
          selectedFloor={selectedFloor}
          onSelectHostel={handleSelectHostel}
          onSelectBlock={handleSelectBlock}
          onSelectFloor={handleSelectFloor}
          onReset={handleReset}
        />

        {/* Room Grid */}
        <RoomGrid
          rooms={rooms}
          onSelectRoom={handleRoomClick}
        />

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
