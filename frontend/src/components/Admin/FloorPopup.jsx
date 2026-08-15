import React, { useState, useEffect } from 'react';
import { X, Home, Users, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const FloorPopup = ({ floorId, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, [floorId]);

  const fetchSummary = async () => {
    try {
      const res = await api.get(`/admin/floors/${floorId}/summary`);
      setData(res.data.summary);
    } catch (err) {
      toast.error('Failed to load floor summary');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-2xl w-full text-center text-slate-400">
          Loading...
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Home className="w-6 h-6 text-blue-600" />
            Floor {data.floor.floor_number} – {data.floor.block_name} ({data.floor.hostel_name})
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <Home className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <div className="text-2xl font-bold">{data.totalRooms}</div>
            <div className="text-xs text-slate-500">Rooms</div>
          </div>
          <div className="bg-purple-50 rounded-xl p-3 text-center">
            <Users className="w-5 h-5 text-purple-600 mx-auto mb-1" />
            <div className="text-2xl font-bold">{data.totalStudents}</div>
            <div className="text-xs text-slate-500">Students</div>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 text-center">
            <CheckCircle className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
            <div className="text-2xl font-bold">{data.vacant}</div>
            <div className="text-xs text-slate-500">Vacant</div>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 text-center">
            <Clock className="w-5 h-5 text-amber-600 mx-auto mb-1" />
            <div className="text-2xl font-bold">{data.pending}</div>
            <div className="text-xs text-slate-500">Pending</div>
          </div>
        </div>

        {data.rooms && data.rooms.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Rooms</h4>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 text-left">Room</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Occupancy</th>
                </tr>
              </thead>
              <tbody>
                {data.rooms.map(room => (
                  <tr key={room.room_id} className="border-b border-slate-100">
                    <td className="px-3 py-2 font-medium">{room.room_number}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        room.status === 'Vacant' ? 'bg-green-100 text-green-700' :
                        room.status === 'Pending_Pairing' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {room.status ? room.status.replace('_', ' ') : 'Vacant'}
                      </span>
                    </td>
                    <td className="px-3 py-2">{room.current_occupancy}/{room.capacity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl text-sm font-medium">Close</button>
        </div>
      </div>
    </div>
  );
};

export default FloorPopup;
