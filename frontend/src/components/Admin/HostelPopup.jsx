import React, { useState, useEffect } from 'react';
import { X, Building2, Layers, Home, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const HostelPopup = ({ hostelId, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, [hostelId]);

  const fetchSummary = async () => {
    try {
      const res = await api.get(`/admin/hostels/${hostelId}/summary`);
      setData(res.data.summary);
    } catch (err) {
      toast.error('Failed to load hostel summary');
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
      <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            {data.hostel.name} Hostel
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <Layers className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-slate-900">{data.totalBlocks}</div>
            <div className="text-xs text-slate-500">Blocks</div>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 text-center">
            <Home className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-slate-900">{data.totalFloors}</div>
            <div className="text-xs text-slate-500">Floors</div>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 text-center">
            <Home className="w-5 h-5 text-amber-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-slate-900">{data.totalRooms}</div>
            <div className="text-xs text-slate-500">Rooms</div>
          </div>
          <div className="bg-purple-50 rounded-xl p-3 text-center">
            <Users className="w-5 h-5 text-purple-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-slate-900">{data.totalStudents}</div>
            <div className="text-xs text-slate-500">Students</div>
          </div>
        </div>

        {/* Block Summary Table */}
        {data.blockSummary && data.blockSummary.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Block Summary</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Block</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Floors</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Rooms</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Students</th>
                  </tr>
                </thead>
                <tbody>
                  {data.blockSummary.map((block) => (
                    <tr key={block.block_id} className="border-b border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-800">{block.name}</td>
                      <td className="px-3 py-2 text-slate-600">{block.floorCount}</td>
                      <td className="px-3 py-2 text-slate-600">{block.roomCount}</td>
                      <td className="px-3 py-2 text-slate-600">{block.studentCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl text-sm font-medium transition">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default HostelPopup;
