import React, { useState } from 'react';
import { X, Plus, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const AddMissingFloorsModal = ({ isOpen, onClose, blockId, missingFloors = [], onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [floorStart, setFloorStart] = useState('');
  const [floorEnd, setFloorEnd] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const start = parseInt(floorStart, 10);
    const end = parseInt(floorEnd, 10);

    if (isNaN(start) || isNaN(end) || start > end) {
      toast.error('Please enter a valid floor range (start <= end)');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/admin/floors/bulk', {
        blockId: parseInt(blockId, 10),
        floorStart: start,
        floorEnd: end
      });
      toast.success(res.data.message || 'Floors added successfully');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add floors');
    } finally {
      setLoading(false);
    }
  };

  const missingList = missingFloors.length > 0 ? missingFloors.join(', ') : 'None';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" />
            Add Missing Floors
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {missingFloors.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Detected Missing Floors:</span> {missingList}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Start Floor</label>
              <input
                type="number"
                value={floorStart}
                onChange={(e) => setFloorStart(e.target.value)}
                placeholder="e.g. 0"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">End Floor</label>
              <input
                type="number"
                value={floorEnd}
                onChange={(e) => setFloorEnd(e.target.value)}
                placeholder="e.g. 10"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-sm"
            >
              {loading ? 'Adding Floors...' : 'Add Floors'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMissingFloorsModal;
