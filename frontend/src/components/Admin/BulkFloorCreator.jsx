import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import api from '../../api/axios';

const BulkFloorCreator = ({ blocks, onSuccess }) => {
  const [blockId, setBlockId] = useState('');
  const [floorStart, setFloorStart] = useState('');
  const [floorEnd, setFloorEnd] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!blockId) {
      setError('Please select a target block.');
      return;
    }

    const start = parseInt(floorStart, 10);
    const end = parseInt(floorEnd, 10);

    if (isNaN(start) || isNaN(end)) {
      setError('Please enter valid floor numbers.');
      return;
    }

    if (start < 0 || end < 0) {
      setError('Floor numbers cannot be negative.');
      return;
    }

    if (start > end) {
      setError('Start floor must be less than or equal to end floor.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/admin/floors/bulk', {
        blockId: parseInt(blockId, 10),
        floorStart: start,
        floorEnd: end
      });

      const { data } = response;
      let msg = `✅ ${data.message}`;
      if (data.skippedCount > 0) {
        msg += ` | ⚠️ Skipped ${data.skippedCount} existing floor(s): ${data.skippedFloors.join(', ')}`;
      }
      setMessage(msg);

      // Reset floor inputs
      setFloorStart('');
      setFloorEnd('');

      if (onSuccess) onSuccess();

    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to create floors.';
      setError(`❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
        <Plus className="w-5 h-5 text-amber-500" />
        Add Floors (Range-Based Bulk Creation)
      </h3>
      <p className="text-xs text-slate-500 mb-4">
        Add multiple floors at once by entering a range (e.g., 0 to 10 for Ground Floor to Floor 10). Existing floors will be skipped automatically.
      </p>

      {message && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Block Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
            Target Block
          </label>
          <select
            value={blockId}
            onChange={(e) => setBlockId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
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

        {/* Floor Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
              Start Floor No.
            </label>
            <input
              type="number"
              value={floorStart}
              onChange={(e) => setFloorStart(e.target.value)}
              placeholder="e.g. 0"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
              min="0"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
              End Floor No.
            </label>
            <input
              type="number"
              value={floorEnd}
              onChange={(e) => setFloorEnd(e.target.value)}
              placeholder="e.g. 10"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
              min="0"
              required
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          {loading ? 'Creating Floors...' : 'Create Floors'}
        </button>
      </form>
    </div>
  );
};

export default BulkFloorCreator;
