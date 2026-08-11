import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Grid, Plus, Trash2, Lock, Unlock, Filter } from 'lucide-react';

const FloorManager = () => {
  const [floors, setFloors] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [filterBlockId, setFilterBlockId] = useState('ALL');

  const [newBlockId, setNewBlockId] = useState('');
  const [newFloorNumber, setNewFloorNumber] = useState(1);

  const fetchBlocks = async () => {
    try {
      const res = await api.get('/admin/blocks?hostelId=ALL');
      setBlocks(res.data.blocks || []);
      if (res.data.blocks?.length > 0 && !newBlockId) {
        setNewBlockId(res.data.blocks[0].block_id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFloors = async () => {
    try {
      const res = await api.get('/admin/floors', {
        params: { blockId: filterBlockId }
      });
      setFloors(res.data.floors || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBlocks();
  }, []);

  useEffect(() => {
    fetchFloors();
  }, [filterBlockId]);

  const handleCreateFloor = async (e) => {
    e.preventDefault();
    if (!newBlockId || newFloorNumber === '') return;

    try {
      await api.post('/admin/floors', {
        block_id: parseInt(newBlockId, 10),
        floor_number: parseInt(newFloorNumber, 10)
      });
      setNewFloorNumber(newFloorNumber + 1);
      fetchFloors();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create floor.');
    }
  };

  const handleDeleteFloor = async (floorId) => {
    if (!window.confirm('Delete this floor? All rooms on this floor will be deleted.')) return;
    try {
      await api.delete(`/admin/floors/${floorId}`);
      fetchFloors();
    } catch (err) {
      alert('Failed to delete floor.');
    }
  };

  const handleToggleReserve = async (floorId) => {
    try {
      await api.put(`/admin/floors/${floorId}/reserve`);
      fetchFloors();
    } catch (err) {
      alert('Failed to toggle floor reservation.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Create Floor */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-amber-500" />
          Add Floor to Block
        </h2>

        <form onSubmit={handleCreateFloor} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Target Block</label>
            <select
              value={newBlockId}
              onChange={(e) => setNewBlockId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
              required
            >
              {blocks.map((b) => (
                <option key={b.block_id} value={b.block_id}>
                  {b.name} ({b.Hostel?.name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Floor Number</label>
            <input
              type="number"
              min={1}
              max={50}
              value={newFloorNumber}
              onChange={(e) => setNewFloorNumber(parseInt(e.target.value, 10))}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition text-sm flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Create Floor
            </button>
          </div>
        </form>
      </div>

      {/* Directory & Filters */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Grid className="w-5 h-5 text-amber-500" />
              Floors Directory
            </h2>
            <p className="text-xs text-slate-500">Toggle floor reservation status (`is_reserved`) to hide floors from students.</p>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-amber-500" />
            <select
              value={filterBlockId}
              onChange={(e) => setFilterBlockId(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium"
            >
              <option value="ALL">All Blocks (Select All)</option>
              {blocks.map((b) => (
                <option key={b.block_id} value={b.block_id}>{b.name} ({b.Hostel?.name})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
                <th className="p-3.5">ID</th>
                <th className="p-3.5">Floor Number</th>
                <th className="p-3.5">Block / Hostel</th>
                <th className="p-3.5">Reservation Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {floors.map((f) => (
                <tr key={f.floor_id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3.5 font-bold text-slate-400">#{f.floor_id}</td>
                  <td className="p-3.5 font-bold text-slate-900">Floor {f.floor_number}</td>
                  <td className="p-3.5 text-slate-600 font-medium">{f.Block?.name} ({f.Block?.Hostel?.name})</td>
                  <td className="p-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase inline-flex items-center gap-1 ${f.is_reserved ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800'}`}>
                      {f.is_reserved ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      {f.is_reserved ? 'Reserved (Hidden)' : 'Active (Visible)'}
                    </span>
                  </td>
                  <td className="p-3.5 text-right space-x-2">
                    <button
                      onClick={() => handleToggleReserve(f.floor_id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition ${f.is_reserved ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'}`}
                    >
                      {f.is_reserved ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      {f.is_reserved ? 'Unreserve' : 'Mark Reserved'}
                    </button>
                    <button
                      onClick={() => handleDeleteFloor(f.floor_id)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {floors.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 text-sm">
                    No floors found for selected block filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FloorManager;
