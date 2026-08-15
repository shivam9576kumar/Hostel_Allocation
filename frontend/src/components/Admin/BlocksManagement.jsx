import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import BlockGrid from './BlockGrid';

const BlocksManagement = ({ onNavigateToFloors }) => {
  const { hostelId: paramHostelId } = useParams();
  const navigate = useNavigate();

  const [hostels, setHostels] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [selectedHostel, setSelectedHostel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    fetchHostels();
  }, [paramHostelId]);

  const fetchHostels = async () => {
    try {
      const res = await api.get('/admin/hostels');
      const hostelList = res.data.hostels || [];
      setHostels(hostelList);

      let targetHostel = hostelList[0];
      if (paramHostelId) {
        const found = hostelList.find(h => h.hostel_id === parseInt(paramHostelId, 10));
        if (found) targetHostel = found;
      }

      if (targetHostel) {
        setSelectedHostel(targetHostel);
        fetchBlocks(targetHostel.hostel_id);
      }
    } catch (err) {
      toast.error('Failed to fetch hostels');
    }
  };

  const fetchBlocks = async (hostelId) => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/blocks/summary?hostelId=${hostelId}`);
      setBlocks(res.data.blocks || []);
    } catch (err) {
      toast.error('Failed to fetch blocks summary');
    } finally {
      setLoading(false);
    }
  };

  const handleHostelChange = (e) => {
    const hId = parseInt(e.target.value, 10);
    const hostel = hostels.find(h => h.hostel_id === hId);
    if (hostel) {
      setSelectedHostel(hostel);
      navigate(`/admin/hostels/${hId}/blocks`);
      fetchBlocks(hId);
    }
  };

  const handleAddBlock = async (blockName) => {
    if (!selectedHostel) return;
    try {
      await api.post('/admin/blocks', {
        hostel_id: selectedHostel.hostel_id,
        name: blockName
      });
      toast.success(`Block ${blockName} created successfully!`);
      fetchBlocks(selectedHostel.hostel_id);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add block');
    }
  };

  const handleBlockUpdated = () => {
    if (selectedHostel) {
      fetchBlocks(selectedHostel.hostel_id);
    }
  };

  // Calculate next block letter sequentially (A, B, C...)
  const getNextBlockLetter = () => {
    if (blocks.length === 0) return 'A';
    const sortedBlocks = [...blocks].sort((a, b) => a.name.localeCompare(b.name));
    const lastBlock = sortedBlocks[sortedBlocks.length - 1];
    const cleanName = lastBlock.name.replace(/BLOCK/i, '').trim();
    if (cleanName.length === 1 && cleanName >= 'A' && cleanName <= 'Z') {
      return String.fromCharCode(cleanName.charCodeAt(0) + 1);
    }
    return String(blocks.length + 1);
  };

  // Filter blocks by status
  const filteredBlocks = blocks.filter(block => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'ACTIVE') return !block.is_reserved;
    if (statusFilter === 'RESERVED') return block.is_reserved;
    return true;
  });

  const nextBlockLetter = getNextBlockLetter();
  const nextBlockName = `BLOCK ${nextBlockLetter}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            Blocks Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage hostel blocks, view room occupancy metrics, and toggle reservation status.
          </p>
        </div>
        <button
          onClick={() => selectedHostel && fetchBlocks(selectedHostel.hostel_id)}
          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-sm"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Hostel:</label>
            <select
              value={selectedHostel?.hostel_id || ''}
              onChange={handleHostelChange}
              className="px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {hostels.map((h) => (
                <option key={h.hostel_id} value={h.hostel_id}>{h.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active (Visible)</option>
              <option value="RESERVED">Reserved (Hidden)</option>
            </select>
          </div>
        </div>

        <div className="text-xs font-semibold text-slate-500">
          <span className="text-blue-600 font-bold">{filteredBlocks.length}</span> blocks shown • Next: <span className="text-amber-600 font-bold">{nextBlockName}</span>
        </div>
      </div>

      {/* Block Grid Section */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 font-medium animate-pulse">Loading block cards...</div>
      ) : selectedHostel ? (
        <BlockGrid
          blocks={filteredBlocks}
          nextBlockName={nextBlockName}
          hostelId={selectedHostel.hostel_id}
          onAddBlock={handleAddBlock}
          onBlockUpdated={handleBlockUpdated}
          onViewFloors={(block) => {
            if (onNavigateToFloors) {
              onNavigateToFloors(block);
            } else {
              navigate(`/admin/hostels/${selectedHostel.hostel_id}/blocks/${block.block_id}/floors`);
            }
          }}
        />
      ) : (
        <div className="text-center py-12 text-slate-400 font-medium">Select a hostel to view blocks.</div>
      )}
    </div>
  );
};

export default BlocksManagement;
