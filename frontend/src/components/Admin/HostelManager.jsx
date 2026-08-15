import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Building2, Plus, Trash2, ShieldCheck, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const HostelManager = () => {
  const navigate = useNavigate();
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form State for New Hostel (ONLY Hostel Name)
  const [newHostelName, setNewHostelName] = useState('');

  const fetchHostels = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/hostels');
      setHostels(res.data.hostels || []);
    } catch (err) {
      setError('Failed to fetch hostels list.');
      toast.error('Failed to fetch hostels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHostels();
  }, []);

  const handleCreateHostel = async (e) => {
    e.preventDefault();
    if (!newHostelName.trim()) {
      toast.error('Please enter a hostel name.');
      return;
    }

    try {
      await api.post('/admin/hostels', {
        name: newHostelName.trim()
      });
      toast.success(`Hostel "${newHostelName}" created successfully!`);
      setNewHostelName('');
      fetchHostels();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create hostel.');
    }
  };

  const handleDeleteHostel = async (hostel) => {
    if (!window.confirm(
      `⚠️ Delete Hostel "${hostel.name}"?\n\n` +
      `This will permanently delete:\n` +
      `• All blocks, floors, and rooms in this hostel\n` +
      `• All student bookings in this hostel\n\n` +
      `Students will be reset to Pending status.`
    )) return;

    try {
      await api.delete(`/admin/hostels/${hostel.hostel_id}`);
      toast.success(`Hostel "${hostel.name}" deleted.`);
      fetchHostels();
    } catch (err) {
      toast.error('Failed to delete hostel.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            Hostel Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Create hostels by entering their name. Block, floor, and room hierarchy are configured within each hostel.
          </p>
        </div>
      </div>

      {/* New Hostel Creation Form (ONLY HOSTEL NAME) */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-blue-600" />
          Create New Hostel
        </h2>

        <form onSubmit={handleCreateHostel} className="flex flex-col sm:flex-row items-end gap-4 max-w-xl">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
              Hostel Name
            </label>
            <input
              type="text"
              value={newHostelName}
              onChange={(e) => setNewHostelName(e.target.value)}
              placeholder="e.g. Nilgiri Hostel"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition text-sm flex items-center justify-center gap-1.5 shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Hostel
          </button>
        </form>
      </div>

      {/* Hostels Directory Table */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Hostels Directory
            </h2>
            <p className="text-xs text-slate-500">Overview of registered hostels and assigned block counts.</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 font-medium animate-pulse">Loading hostels...</div>
        ) : error ? (
          <div className="text-center py-8 text-rose-500 font-bold">{error}</div>
        ) : hostels.length === 0 ? (
          <div className="text-center py-12 text-slate-400 font-medium bg-slate-50 rounded-2xl border border-slate-200">
            No hostels found. Create your first hostel above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-bold border-b border-slate-200">
                  <th className="p-3.5">ID</th>
                  <th className="p-3.5">Hostel Name</th>
                  <th className="p-3.5">Blocks</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {hostels.map((h) => {
                  const blockCount = h.Blocks ? h.Blocks.length : (h.blocks || 0);

                  return (
                    <tr key={h.hostel_id} className="hover:bg-slate-50 transition">
                      <td className="p-3.5 font-bold text-slate-400">#{h.hostel_id}</td>
                      <td className="p-3.5 font-extrabold text-slate-900">{h.name}</td>
                      <td className="p-3.5 font-bold text-slate-700">
                        <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 text-xs">
                          {blockCount} Block{blockCount !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        <button
                          onClick={() => navigate(`/admin/hostels/${h.hostel_id}/blocks`)}
                          className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Blocks
                        </button>
                        <button
                          onClick={() => handleDeleteHostel(h)}
                          className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition inline-flex items-center"
                          title="Delete Hostel"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default HostelManager;
