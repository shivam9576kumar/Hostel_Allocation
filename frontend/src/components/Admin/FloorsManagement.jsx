import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Layers, RefreshCw, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import BlockSelector from './BlockSelector';
import FloorGrid from './FloorGrid';
import FloorPopup from './FloorPopup';

const FloorsManagement = ({ initialBlock, onBackToBlocks, onNavigateToRooms }) => {
  const { hostelId: paramHostelId, blockId: paramBlockId } = useParams();
  const [searchParams] = useSearchParams();
  const queryHostelId = searchParams.get('hostelId');
  const queryBlockId = searchParams.get('blockId');

  const navigate = useNavigate();

  const [hostels, setHostels] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [selectedHostel, setSelectedHostel] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [popupFloorId, setPopupFloorId] = useState(null);

  const activeHostelId = paramHostelId || queryHostelId || initialBlock?.hostel_id;
  const activeBlockId = paramBlockId || queryBlockId || initialBlock?.block_id;

  useEffect(() => {
    fetchHostels();
  }, [activeHostelId, activeBlockId]);

  const fetchHostels = async () => {
    try {
      const res = await api.get('/admin/hostels');
      const hostelList = res.data.hostels || [];
      setHostels(hostelList);

      let targetHostel = hostelList[0];
      if (activeHostelId) {
        const found = hostelList.find(h => String(h.hostel_id) === String(activeHostelId));
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

  const fetchBlocks = async (hId) => {
    try {
      const res = await api.get(`/admin/blocks?hostelId=${hId}`);
      const blockList = res.data.blocks || [];
      setBlocks(blockList);

      let targetBlock = blockList[0];
      if (activeBlockId) {
        const found = blockList.find(b => String(b.block_id) === String(activeBlockId));
        if (found) targetBlock = found;
      }

      if (targetBlock) {
        setSelectedBlock(targetBlock);
        fetchFloors(targetBlock.block_id);
      } else {
        setFloors([]);
        setSelectedBlock(null);
      }
    } catch (err) {
      toast.error('Failed to fetch blocks');
    }
  };

  const fetchFloors = async (bId) => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/floors/summary?blockId=${bId}`);
      setFloors(res.data.floors || []);
    } catch (err) {
      toast.error('Failed to fetch floor data');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockChange = (block) => {
    setSelectedBlock(block);
    if (block) {
      navigate(`/admin/floors?blockId=${block.block_id}`);
      fetchFloors(block.block_id);
    } else {
      setFloors([]);
    }
  };

  const handleHostelChange = (e) => {
    const hId = parseInt(e.target.value, 10);
    const hostel = hostels.find(h => h.hostel_id === hId);
    setSelectedHostel(hostel || null);
    if (hostel) {
      fetchBlocks(hostel.hostel_id);
    } else {
      setBlocks([]);
      setFloors([]);
    }
  };

  const handleFloorClick = (floor) => {
    setPopupFloorId(floor.floor_id);
  };

  const handleAddSingleFloor = async (floorNumber) => {
    if (!selectedBlock) return;
    try {
      await api.post('/admin/floors/bulk', {
        blockId: selectedBlock.block_id,
        floorStart: floorNumber,
        floorEnd: floorNumber
      });
      toast.success(`Floor ${floorNumber} created successfully!`);
      fetchFloors(selectedBlock.block_id);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add floor');
    }
  };

  const goBack = () => {
    navigate(-1);
  };

  const nextFloorNumber = floors.length > 0
    ? Math.max(...floors.map(f => f.floor_number)) + 1
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-blue-600" />
            Floors Management {selectedBlock ? `- ${selectedBlock.name}` : ''}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage floors and room metrics for the selected block.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Blocks
          </button>

          <button
            onClick={() => selectedBlock && fetchFloors(selectedBlock.block_id)}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Hostel & Block Filters Bar */}
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
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Block:</label>
            <BlockSelector
              blocks={blocks}
              selectedBlock={selectedBlock}
              onSelect={handleBlockChange}
              loading={loading}
            />
          </div>
        </div>

        <div className="text-xs font-semibold text-slate-500">
          <span className="text-blue-600 font-bold">{floors.length}</span> floors created • Next: <span className="text-amber-600 font-bold">Floor {nextFloorNumber}</span>
        </div>
      </div>

      {/* Floor Grid Section */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 font-medium animate-pulse">Loading floors...</div>
      ) : selectedBlock ? (
        <FloorGrid
          floors={floors}
          nextFloorNumber={nextFloorNumber}
          onAddFloor={handleAddSingleFloor}
          onFloorClick={handleFloorClick}
          onRefresh={() => selectedBlock && fetchFloors(selectedBlock.block_id)}
        />
      ) : (
        <div className="text-center py-12 text-slate-400 font-medium">Select a hostel and block to view floors.</div>
      )}

      {/* Floor Summary Popup */}
      {popupFloorId && (
        <FloorPopup
          floorId={popupFloorId}
          onClose={() => setPopupFloorId(null)}
        />
      )}
    </div>
  );
};

export default FloorsManagement;
