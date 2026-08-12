import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Layers, PlusCircle, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

const BulkRoomCreator = ({ onSuccess }) => {
  const [floors, setFloors] = useState([]);
  const [floorId, setFloorId] = useState('');
  const [roomStart, setRoomStart] = useState('');
  const [roomEnd, setRoomEnd] = useState('');
  const [capacity, setCapacity] = useState(2);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [skippedInfo, setSkippedInfo] = useState([]);

  const fetchFloors = async () => {
    try {
      const res = await api.get('/admin/floors?blockId=ALL');
      const floorList = res.data.floors || [];
      setFloors(floorList);
      if (floorList.length > 0 && !floorId) {
        setFloorId(floorList[0].floor_id);
      }
    } catch (err) {
      console.error('Error fetching floors for bulk room creator:', err);
    }
  };

  useEffect(() => {
    fetchFloors();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setSkippedInfo([]);

    if (!floorId || !roomStart || !roomEnd) {
      setError('Please select a floor and enter valid start and end room numbers.');
      return;
    }

    const startNum = parseInt(roomStart, 10);
    const endNum = parseInt(roomEnd, 10);

    if (isNaN(startNum) || isNaN(endNum)) {
      setError('Room numbers must be numeric values (e.g. 101 to 136).');
      return;
    }

    if (startNum > endNum) {
      setError('Starting room number must be less than or equal to ending room number.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/admin/rooms/bulk', {
        floorId: parseInt(floorId, 10),
        roomStart: startNum,
        roomEnd: endNum,
        capacity: parseInt(capacity, 10) || 2
      });

      const count = res.data.createdCount || 0;
      setMessage(res.data.message || `Successfully created ${count} room(s).`);
      
      const skippedList = res.data.skipped || res.data.skippedRooms || res.data.errors || [];
      if (skippedList.length > 0) {
        setSkippedInfo(skippedList);
      }

      setRoomStart('');
      setRoomEnd('');

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Bulk room creation error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Something went wrong. Please try again.';
      setError(errorMsg);

      const skippedList = err.response?.data?.skipped || err.response?.data?.skippedRooms || err.response?.data?.errors || [];
      if (skippedList.length > 0) {
        setSkippedInfo(skippedList);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
      <div className="flex items-center gap-2 mb-4">
        <Layers className="w-5 h-5 text-amber-500" />
        <h2 className="text-base font-bold text-slate-900">Add Room(s) (Single or Range)</h2>
      </div>
      <p className="text-xs text-slate-500 mb-6">
        Add one or more rooms by entering a single room number OR a range (e.g., 101 to 136). Pre-existing rooms will be skipped automatically.
      </p>

      {message && (
        <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {skippedInfo.length > 0 && (
        <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1">
          <div className="font-bold flex items-center gap-1 text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5" />
            Skipped Existing Rooms ({skippedInfo.length})
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-slate-700 max-h-32 overflow-y-auto pl-1">
            {skippedInfo.map((info, idx) => (
              <li key={idx}>{info}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Target Floor</label>
          <select
            value={floorId}
            onChange={(e) => setFloorId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
            required
          >
            {floors.map((f) => (
              <option key={f.floor_id} value={f.floor_id}>
                Floor {f.floor_number} ({f.Block?.name} - {f.Block?.Hostel?.name})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Start Room No.</label>
          <input
            type="number"
            placeholder="e.g. 101"
            value={roomStart}
            onChange={(e) => setRoomStart(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">End Room No.</label>
          <input
            type="number"
            placeholder="e.g. 136"
            value={roomEnd}
            onChange={(e) => setRoomEnd(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Room Capacity</label>
          <input
            type="number"
            min="1"
            max="10"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
            required
          />
        </div>

        <div className="md:col-span-4 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="py-2.5 px-6 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold rounded-xl transition text-sm flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing Range...
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                Add Room(s)
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BulkRoomCreator;
