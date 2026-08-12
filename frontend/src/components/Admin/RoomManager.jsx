import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { DoorClosed, Trash2, Lock, Unlock, Users, Filter } from 'lucide-react';
import BulkRoomCreator from './BulkRoomCreator';

const RoomManager = () => {
  const [rooms, setRooms] = useState([]);
  const [floors, setFloors] = useState([]);
  const [filterFloorId, setFilterFloorId] = useState('ALL');

  const fetchFloors = async () => {
    try {
      const res = await api.get('/admin/floors?blockId=ALL');
      setFloors(res.data.floors || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRooms = async () => {
    try {
      const res = await api.get('/admin/rooms', {
        params: { floorId: filterFloorId }
      });
      setRooms(res.data.rooms || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchFloors();
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [filterFloorId]);

  const handleDeleteRoom = async (roomId) => {
    if (!window.confirm('Delete this room? Associated bookings will be removed.')) return;
    try {
      await api.delete(`/admin/rooms/${roomId}`);
      fetchRooms();
    } catch (err) {
      alert('Failed to delete room.');
    }
  };

  const handleToggleReserve = async (roomId) => {
    try {
      await api.put(`/admin/rooms/${roomId}/reserve`);
      fetchRooms();
    } catch (err) {
      alert('Failed to toggle room reservation status.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Add Room(s) (Single or Range) Creator */}
      <BulkRoomCreator onSuccess={fetchRooms} />

      {/* Directory & Filters */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <DoorClosed className="w-5 h-5 text-amber-500" />
              Rooms Directory & Occupancy
            </h2>
            <p className="text-xs text-slate-500">Toggle room reservation status (`is_reserved`) to hide specific rooms from student grid.</p>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-amber-500" />
            <select
              value={filterFloorId}
              onChange={(e) => setFilterFloorId(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium"
            >
              <option value="ALL">All Floors (Select All)</option>
              {floors.map((f) => (
                <option key={f.floor_id} value={f.floor_id}>
                  Floor {f.floor_number} ({f.Block?.name} - {f.Block?.Hostel?.name})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
                <th className="p-3.5">ID</th>
                <th className="p-3.5">Room Number</th>
                <th className="p-3.5">Hierarchy (Hostel / Block / Floor)</th>
                <th className="p-3.5">Occupancy</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Reservation Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {rooms.map((r) => {
                const floor = r.Floor;
                const block = floor?.Block;
                const hostel = block?.Hostel;

                return (
                  <tr key={r.room_id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 font-bold text-slate-400">#{r.room_id}</td>
                    <td className="p-3.5 font-bold text-slate-900">{r.room_number}</td>
                    <td className="p-3.5 text-xs font-medium text-slate-600">
                      {hostel?.name} / {block?.name} / Floor {floor?.floor_number}
                    </td>
                    <td className="p-3.5 font-semibold text-slate-700">
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {r.current_occupancy} / {r.capacity || 2}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-semibold uppercase ${
                        r.status === 'Vacant' ? 'bg-emerald-100 text-emerald-800' :
                        r.status === 'Pending_Pairing' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {r.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase inline-flex items-center gap-1 ${r.is_reserved ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800'}`}>
                        {r.is_reserved ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        {r.is_reserved ? 'Reserved (Hidden)' : 'Active (Visible)'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      <button
                        onClick={() => handleToggleReserve(r.room_id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition ${r.is_reserved ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'}`}
                      >
                        {r.is_reserved ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        {r.is_reserved ? 'Unreserve' : 'Mark Reserved'}
                      </button>
                      <button
                        onClick={() => handleDeleteRoom(r.room_id)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {rooms.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-sm">
                    No rooms found for selected floor filter.
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

export default RoomManager;
