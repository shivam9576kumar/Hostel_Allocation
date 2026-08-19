import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  EyeOff, 
  Trash2, 
  Layers, 
  Building2,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from '../../api/axios';
import ConfirmDialog from '../Common/ConfirmDialog';

const BulkFloorManager = ({ blocks: initialBlocks, onSuccess }) => {
  const [blocks, setBlocks] = useState(initialBlocks || []);
  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showReserved, setShowReserved] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: 'danger',
    title: '',
    message: '',
    details: [],
    confirmLabel: 'Delete Floor',
    onConfirm: () => {},
  });

  // Form state
  const [blockId, setBlockId] = useState('');
  const [floorStart, setFloorStart] = useState('');
  const [floorEnd, setFloorEnd] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBlocks = async () => {
    try {
      const response = await axios.get('/admin/blocks?hostelId=ALL');
      setBlocks(response.data.blocks || []);
    } catch (error) {
      console.error('Error fetching blocks:', error);
    }
  };

  const fetchFloors = async () => {
    try {
      const response = await axios.get('/admin/floors');
      setFloors(response.data.floors || []);
    } catch (error) {
      console.error('Error fetching floors:', error);
    }
  };

  useEffect(() => {
    if (!initialBlocks || initialBlocks.length === 0) {
      fetchBlocks();
    }
    fetchFloors();
  }, []);

  // Filter floors
  const filteredFloors = floors.filter(floor => {
    const matchesSearch = floor.floor_number.toString().includes(searchTerm) ||
                          floor.Block?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          floor.Block?.Hostel?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesReserved = showReserved ? floor.is_reserved : true;
    return matchesSearch && matchesReserved;
  });

  // Handle bulk floor creation
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!blockId) {
      toast.error('Please select a target block.');
      return;
    }

    const start = parseInt(floorStart, 10);
    const end = parseInt(floorEnd, 10);

    if (isNaN(start) || isNaN(end)) {
      toast.error('Please enter valid floor numbers.');
      return;
    }

    if (start > end) {
      toast.error('Start floor must be less than or equal to end floor.');
      return;
    }

    if (start < 0 || end < 0) {
      toast.error('Floor numbers cannot be negative.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await axios.post('/admin/floors/bulk', {
        blockId: parseInt(blockId, 10),
        floorStart: start,
        floorEnd: end
      });

      const { data } = response;
      toast.success(`✅ ${data.message}`);

      if (data.skippedCount > 0) {
        toast.warning(`⚠️ Skipped ${data.skippedCount} floor(s): ${data.skippedFloors.join(', ')}`);
      }

      // Reset form
      setFloorStart('');
      setFloorEnd('');
      await fetchFloors();
      if (onSuccess) onSuccess();

    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to create floors';
      toast.error(`❌ ${errorMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle reservation status
  const toggleReservation = async (floorId, currentStatus) => {
    try {
      await axios.put(`/admin/floors/${floorId}/reserve`, {
        is_reserved: !currentStatus
      });
      await fetchFloors();
      toast.success(`Floor ${!currentStatus ? 'reserved' : 'unreserved'} successfully.`);
    } catch (error) {
      toast.error('Failed to update reservation status.');
    }
  };

  // Delete floor
  const deleteFloor = (floorId) => {
    const targetFloor = floors.find(f => f.floor_id === floorId);
    const floorNumStr = targetFloor ? `Floor ${targetFloor.floor_number}` : 'this floor';
    setConfirmDialog({
      isOpen: true,
      type: 'danger',
      title: `Delete ${floorNumStr}?`,
      message: `Are you sure you want to permanently delete ${floorNumStr}?`,
      details: [
        '⚠️ This action CANNOT be undone',
        'All rooms on this floor will be deleted',
        'All student bookings in these rooms will be deleted',
        'Students assigned to these rooms will be reset to "Pending"',
      ],
      confirmLabel: 'Delete Floor',
      onConfirm: async () => {
        try {
          await axios.delete(`/admin/floors/${floorId}`);
          await fetchFloors();
          toast.success('Floor deleted successfully.');
        } catch (error) {
          toast.error('Failed to delete floor.');
        } finally {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Stats
  const totalFloors = floors.length;
  const reservedCount = floors.filter(f => f.is_reserved).length;
  const availableCount = totalFloors - reservedCount;

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-blue-600" />
            Floors Management
          </h1>
          <p className="text-sm text-slate-500">Manage floors, bulk add, and toggle reservation status.</p>
        </div>
        <div className="flex gap-3 text-sm">
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
            <span className="text-slate-500">Total: </span>
            <span className="font-bold text-slate-900">{totalFloors}</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 shadow-sm">
            <span className="text-emerald-600">Available: </span>
            <span className="font-bold text-emerald-700">{availableCount}</span>
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-2 shadow-sm">
            <span className="text-rose-600">Reserved: </span>
            <span className="font-bold text-rose-700">{reservedCount}</span>
          </div>
        </div>
      </div>

      {/* Bulk Add Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition">
        <div className="flex items-center gap-2 mb-3">
          <Plus className="w-5 h-5 text-blue-600" />
          <h3 className="text-base font-bold text-slate-900">Add Floors (Range-Based)</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Add multiple floors at once by entering a range (e.g., <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">0</span> to <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">10</span> for Ground Floor to Floor 10). Existing floors will be skipped automatically.
        </p>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              TARGET BLOCK
            </label>
            <select
              value={blockId}
              onChange={(e) => setBlockId(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              required
            >
              <option value="">Select Target Block</option>
              {blocks.map((block) => (
                <option key={block.block_id} value={block.block_id}>
                  {block.name} ({block.Hostel?.name || 'Unknown Hostel'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">START FLOOR NO.</label>
            <input
              type="number"
              value={floorStart}
              onChange={(e) => setFloorStart(e.target.value)}
              placeholder="e.g. 0"
              className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">END FLOOR NO.</label>
            <input
              type="number"
              value={floorEnd}
              onChange={(e) => setFloorEnd(e.target.value)}
              placeholder="e.g. 10"
              className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl transition flex items-center justify-center gap-2 text-sm disabled:opacity-50 h-[42px]"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {isSubmitting ? 'Creating...' : 'Create Floors'}
          </button>
        </form>
      </div>

      {/* Floor Directory */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-slate-800">Floors Directory</h3>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {filteredFloors.length} floors
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search floor or block..."
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 md:w-56"
              />
            </div>
            {/* Toggle Reserved */}
            <button
              onClick={() => setShowReserved(!showReserved)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition ${
                showReserved 
                  ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {showReserved ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {showReserved ? 'Showing Reserved' : 'Hide Reserved'}
            </button>
            <button
              onClick={fetchFloors}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm text-slate-600 transition flex items-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Floor Number</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Block / Hostel</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Reservation Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFloors.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p>No floors found matching your criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredFloors.map((floor) => (
                  <tr key={floor.floor_id} className="border-b border-slate-100 hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono">#{floor.floor_id}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-medium">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        {floor.floor_number === 0 ? 'Floor 0 (Ground)' : `Floor ${floor.floor_number}`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-medium text-slate-700">{floor.Block?.name || 'N/A'}</span>
                        <span className="text-xs text-slate-400 block">{floor.Block?.Hostel?.name || ''}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                        floor.is_reserved
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}>
                        {floor.is_reserved ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            RESERVED
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            ACTIVE (VISIBLE)
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleReservation(floor.floor_id, floor.is_reserved)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                            floor.is_reserved
                              ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'
                              : 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200'
                          }`}
                        >
                          {floor.is_reserved ? 'Unreserve' : 'Mark Reserved'}
                        </button>
                        <button
                          onClick={() => deleteFloor(floor.floor_id)}
                          className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-medium transition flex items-center gap-1 border border-rose-200"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
    </div>
  );
};

export default BulkFloorManager;
