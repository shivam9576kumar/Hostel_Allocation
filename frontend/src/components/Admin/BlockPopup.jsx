import React, { useState, useEffect } from 'react';
import { X, Layers, Home, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const BlockPopup = ({ blockId, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, [blockId]);

  const fetchSummary = async () => {
    try {
      const res = await api.get(`/admin/blocks/${blockId}/summary`);
      setData(res.data.summary);
    } catch (err) {
      toast.error('Failed to load block summary');
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
            <Layers className="w-6 h-6 text-blue-600" />
            {data.block.name} ({data.block.hostel_name})
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <Home className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <div className="text-2xl font-bold">{data.totalFloors}</div>
            <div className="text-xs text-slate-500">Floors</div>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 text-center">
            <Home className="w-5 h-5 text-amber-600 mx-auto mb-1" />
            <div className="text-2xl font-bold">{data.totalRooms}</div>
            <div className="text-xs text-slate-500">Rooms</div>
          </div>
          <div className="bg-purple-50 rounded-xl p-3 text-center">
            <Users className="w-5 h-5 text-purple-600 mx-auto mb-1" />
            <div className="text-2xl font-bold">{data.totalStudents}</div>
            <div className="text-xs text-slate-500">Students</div>
          </div>
        </div>

        {data.floorSummary && data.floorSummary.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Floor Summary</h4>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 text-left">Floor</th>
                  <th className="px-3 py-2 text-left">Rooms</th>
                  <th className="px-3 py-2 text-left">Students</th>
                </tr>
              </thead>
              <tbody>
                {data.floorSummary.map(f => (
                  <tr key={f.floor_id} className="border-b border-slate-100">
                    <td className="px-3 py-2 font-medium">Floor {f.floor_number}</td>
                    <td className="px-3 py-2">{f.roomCount}</td>
                    <td className="px-3 py-2">{f.studentCount}</td>
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

export default BlockPopup;
