import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const AddRoomsForm = ({ floorId, onSuccess, floorNumber }) => {
  const [startRoom, setStartRoom] = useState('');
  const [endRoom, setEndRoom] = useState('');
  const [capacity, setCapacity] = useState(2);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const start = parseInt(startRoom, 10);
    const end = parseInt(endRoom, 10);

    if (isNaN(start) || isNaN(end) || start > end || start < 0) {
      toast.error('Enter a valid room range (start <= end, start >= 0).');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/admin/rooms/bulk', {
        floorId: parseInt(floorId, 10),
        roomStart: start,
        roomEnd: end,
        capacity: parseInt(capacity, 10)
      });
      toast.success(res.data.message || 'Rooms created successfully!');
      setStartRoom('');
      setEndRoom('');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create rooms');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2 mb-3">
        <Plus className="w-4 h-4 text-blue-600" />
        Add Rooms to Floor {floorNumber !== undefined ? floorNumber : ''}
      </h3>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500">Start Room #:</label>
          <input
            type="number"
            value={startRoom}
            onChange={(e) => setStartRoom(e.target.value)}
            placeholder="e.g. 101"
            className="w-24 px-3 py-1.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            required
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500">End Room #:</label>
          <input
            type="number"
            value={endRoom}
            onChange={(e) => setEndRoom(e.target.value)}
            placeholder="e.g. 160"
            className="w-24 px-3 py-1.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            required
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500">Capacity:</label>
          <select
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1">1 (Single)</option>
            <option value="2">2 (Double)</option>
            <option value="3">3 (Triple)</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
        >
          <Plus className="w-4 h-4" /> {loading ? 'Creating...' : 'Add Rooms'}
        </button>
      </form>
    </div>
  );
};

export default AddRoomsForm;
