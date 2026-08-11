import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Layers, Plus, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

const BulkRoomCreator = ({ onSuccess }) => {
  const [floors, setFloors] = useState([]);
  const [floorId, setFloorId] = useState('');
  const [roomStart, setRoomStart] = useState('');
  const [roomEnd, setRoomEnd] = useState('');
  const [capacity, setCapacity] = useState(2);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [skipped, setSkipped] = useState([]);

  useEffect(() => {
    fetchFloors();
  }, []);

  const fetchFloors = async () => {
    try {
      const res = await api.get('/admin/floors?blockId=ALL');
      const fetchedFloors = res.data.floors || [];
      setFloors(fetchedFloors);
      if (fetchedFloors.length > 0 && !floorId) {
        setFloorId(fetchedFloors[0].floor_id);
      }
    } catch (err) {
      console.error('Failed to fetch floors for bulk creator:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setSkipped([]);

    // Validation
    if (!floorId) {
      setError('Please select a target floor.');
      return;
    }
    if (roomStart === '' || roomEnd === '') {
      setError('Start and End room numbers are required.');
      return;
    }

    const startNum = parseInt(roomStart, 10);
    const endNum = parseInt(roomEnd, 10);

    if (isNaN(startNum) || isNaN(endNum)) {
      setError('Room numbers must be valid integers.');
      return;
    }

    if (startNum > endNum) {
      setError('Start Room Number must be less than or equal to End Room Number.');
      return;
    }

    const parsedCapacity = capacity ? parseInt(capacity, 10) : 2;

    setLoading(true);
    try {
      const payload = {
        floorId: parseInt(floorId, 10),
        roomStart: startNum,
        roomEnd: endNum,
        capacity: parsedCapacity
      };

      const res = await api.post('/admin/rooms/bulk', payload);

      const createdCount = res.data.createdRooms ? res.data.createdRooms.length : 0;
      const skippedList = res.data.errors || [];

      setMessage(res.data.message || `Successfully created ${createdCount} room(s).`);
      setSkipped(skippedList);

      // Reset start/end numbers after successful request
      setRoomStart('');
      setRoomEnd('');

      if (onSuccess && typeof onSuccess === 'function') {
        onSuccess();
      }
    } catch (err) {
      console.error('Error creating rooms in bulk:', err);
      const errMsg = err.response?.data?.error || 'Failed to bulk create rooms. Please try again.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-500" />
            Bulk Add Rooms (Range-Based)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Add multiple sequential rooms at once by specifying a range (e.g., 101 to 136).
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
          <div>
            <p className="font-semibold">{message}</p>
            {skipped.length > 0 && (
              <div className="mt-1 text-amber-800 bg-amber-50 border border-amber-200 p-2 rounded-lg text-xs">
                <span className="font-semibold block mb-0.5">Skipped Existing Rooms ({skipped.length}):</span>
                <span className="text-slate-600">{skipped.join(', ')}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-1">
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
            Target Floor
          </label>
          <select
            value={floorId}
            onChange={(e) => setFloorId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
            required
          >
            <option value="" disabled>Select Floor</option>
            {floors.map((f) => (
              <option key={f.floor_id} value={f.floor_id}>
                Floor {f.floor_number} ({f.Block?.name} - {f.Block?.Hostel?.name})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
            Start Room Number
          </label>
          <input
            type="number"
            placeholder="e.g. 101"
            value={roomStart}
            onChange={(e) => setRoomStart(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
            End Room Number
          </label>
          <input
            type="number"
            placeholder="e.g. 136"
            value={roomEnd}
            onChange={(e) => setRoomEnd(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
            Capacity per Room
          </label>
          <input
            type="number"
            min="1"
            placeholder="Default: 2"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>

        <div className="md:col-span-4 flex justify-end mt-1">
          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto py-2.5 px-6 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-slate-950 font-bold rounded-xl transition text-sm flex items-center justify-center gap-2 shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating Rooms...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Create Rooms (Bulk)
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BulkRoomCreator;
