import React, { useState } from 'react';
import { Building2, Eye, Layers, Trash2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const HostelCard = ({ hostel, onClick, onRefresh }) => {
  const [loading, setLoading] = useState(false);

  const handleClear = async () => {
    if (!window.confirm(
      `⚠️ Clear Hostel "${hostel.name}"?\n\n` +
      `This will permanently delete:\n` +
      `• All blocks in this hostel\n` +
      `• All floors in this hostel\n` +
      `• All rooms in this hostel\n` +
      `• All bookings in this hostel\n` +
      `• All students will be reset to "Pending"\n\n` +
      `The hostel itself will remain.\n\n` +
      `This action cannot be undone!`
    )) return;

    setLoading(true);
    try {
      await api.post(`/admin/hostels/${hostel.hostel_id}/clear`);
      toast.success(`Hostel "${hostel.name}" cleared successfully.`);
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to clear hostel');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(
      `⚠️ Delete Hostel "${hostel.name}"?\n\n` +
      `This will permanently delete:\n` +
      `• The hostel itself\n` +
      `• All blocks, floors, and rooms\n` +
      `• All bookings and student assignments\n\n` +
      `This action cannot be undone!`
    )) return;

    setLoading(true);
    try {
      await api.delete(`/admin/hostels/${hostel.hostel_id}`);
      toast.success(`Hostel "${hostel.name}" deleted successfully.`);
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete hostel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            {hostel.name}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Blocks: <span className="font-semibold text-slate-700">{hostel.blockCount || 0}</span>
          </p>
        </div>
        <span className="text-xs text-blue-600 font-medium flex items-center gap-1 cursor-pointer" onClick={() => onClick(hostel.hostel_id)}>
          View <Eye className="w-3.5 h-3.5" />
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-100">
        <button
          onClick={() => onClick(hostel.hostel_id)}
          className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition flex items-center gap-1 font-semibold"
        >
          <Eye className="w-3.5 h-3.5" /> View
        </button>
        <button
          onClick={() => window.location.href = `/admin/blocks?hostelId=${hostel.hostel_id}`}
          className="px-3 py-1.5 text-xs bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition flex items-center gap-1 font-semibold"
        >
          <Layers className="w-3.5 h-3.5" /> Manage Blocks
        </button>
        <button
          onClick={handleClear}
          disabled={loading}
          className="px-3 py-1.5 text-xs bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition flex items-center gap-1 font-semibold disabled:opacity-50"
        >
          <AlertCircle className="w-3.5 h-3.5" /> Clear Data
        </button>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="px-3 py-1.5 text-xs bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition flex items-center gap-1 ml-auto font-semibold disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </button>
      </div>
    </div>
  );
};

export default HostelCard;
