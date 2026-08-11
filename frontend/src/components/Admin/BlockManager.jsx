import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Layers, Plus, Trash2, Shield, Lock, Unlock, Filter } from 'lucide-react';

const BlockManager = () => {
  const [blocks, setBlocks] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [filterHostelId, setFilterHostelId] = useState('ALL');

  const [newHostelId, setNewHostelId] = useState('');
  const [newBlockName, setNewBlockName] = useState('');

  const fetchHostels = async () => {
    try {
      const res = await api.get('/admin/hostels?gender=ALL&programme=ALL&year=ALL');
      setHostels(res.data.hostels || []);
      if (res.data.hostels?.length > 0 && !newHostelId) {
        setNewHostelId(res.data.hostels[0].hostel_id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBlocks = async () => {
    try {
      const res = await api.get('/admin/blocks', {
        params: { hostelId: filterHostelId }
      });
      setBlocks(res.data.blocks || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchHostels();
  }, []);

  useEffect(() => {
    fetchBlocks();
  }, [filterHostelId]);

  const handleCreateBlock = async (e) => {
    e.preventDefault();
    if (!newHostelId || !newBlockName) return;

    try {
      await api.post('/admin/blocks', {
        hostel_id: parseInt(newHostelId, 10),
        name: newBlockName
      });
      setNewBlockName('');
      fetchBlocks();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create block.');
    }
  };

  const handleDeleteBlock = async (blockId) => {
    if (!window.confirm('Delete this block? All associated floors and rooms will be removed.')) return;
    try {
      await api.delete(`/admin/blocks/${blockId}`);
      fetchBlocks();
    } catch (err) {
      alert('Failed to delete block.');
    }
  };

  const handleToggleReserve = async (blockId) => {
    try {
      await api.put(`/admin/blocks/${blockId}/reserve`);
      fetchBlocks();
    } catch (err) {
      alert('Failed to toggle block reservation status.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Create Block Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-amber-500" />
          Add Block to Hostel
        </h2>

        <form onSubmit={handleCreateBlock} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Target Hostel</label>
            <select
              value={newHostelId}
              onChange={(e) => setNewHostelId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
              required
            >
              {hostels.map((h) => (
                <option key={h.hostel_id} value={h.hostel_id}>{h.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Block Name</label>
            <input
              type="text"
              placeholder="e.g. Block A"
              value={newBlockName}
              onChange={(e) => setNewBlockName(e.target.value)}
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
              Create Block
            </button>
          </div>
        </form>
      </div>

      {/* List & Reservations */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-500" />
              Hostel Blocks Directory
            </h2>
            <p className="text-xs text-slate-500">Toggle block reservation status (`is_reserved`) to hide blocks from students.</p>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-amber-500" />
            <select
              value={filterHostelId}
              onChange={(e) => setFilterHostelId(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium"
            >
              <option value="ALL">All Hostels (Select All)</option>
              {hostels.map((h) => (
                <option key={h.hostel_id} value={h.hostel_id}>{h.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
                <th className="p-3.5">ID</th>
                <th className="p-3.5">Block Name</th>
                <th className="p-3.5">Belongs to Hostel</th>
                <th className="p-3.5">Reservation Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {blocks.map((b) => (
                <tr key={b.block_id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3.5 font-bold text-slate-400">#{b.block_id}</td>
                  <td className="p-3.5 font-bold text-slate-900">{b.name}</td>
                  <td className="p-3.5 text-slate-600 font-medium">{b.Hostel?.name || 'N/A'}</td>
                  <td className="p-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase inline-flex items-center gap-1 ${b.is_reserved ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800'}`}>
                      {b.is_reserved ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      {b.is_reserved ? 'Reserved (Hidden)' : 'Active (Visible)'}
                    </span>
                  </td>
                  <td className="p-3.5 text-right space-x-2">
                    <button
                      onClick={() => handleToggleReserve(b.block_id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition ${b.is_reserved ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'}`}
                    >
                      {b.is_reserved ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      {b.is_reserved ? 'Unreserve' : 'Mark Reserved'}
                    </button>
                    <button
                      onClick={() => handleDeleteBlock(b.block_id)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {blocks.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 text-sm">
                    No blocks found for selected hostel filter.
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

export default BlockManager;
