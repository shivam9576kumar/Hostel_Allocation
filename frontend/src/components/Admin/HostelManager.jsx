import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import SettingsModal from './Settings';
import { Building2, Plus, Trash2, Settings, Trash, AlertTriangle, ShieldCheck, Filter } from 'lucide-react';

const HostelManager = () => {
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters (with "ALL" option)
  const [filterGender, setFilterGender] = useState('ALL');

  // Form State for New Hostel
  const [newHostelName, setNewHostelName] = useState('');
  const [newGender, setNewGender] = useState('Male');

  const nowISO = new Date().toISOString().slice(0, 16);
  const futureISO = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

  const [newStartTime, setNewStartTime] = useState(nowISO);
  const [newEndTime, setNewEndTime] = useState(futureISO);

  const [activeSettingsHostel, setActiveSettingsHostel] = useState(null);

  const fetchHostels = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/hostels', {
        params: {
          gender: filterGender
        }
      });
      setHostels(res.data.hostels || []);
    } catch (err) {
      setError('Failed to fetch hostels list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHostels();
  }, [filterGender]);

  const handleCreateHostel = async (e) => {
    e.preventDefault();
    if (!newHostelName) return;

    try {
      await api.post('/admin/hostels', {
        name: newHostelName,
        allowed_gender: newGender,
        start_time: new Date(newStartTime).toISOString(),
        end_time: new Date(newEndTime).toISOString()
      });
      setNewHostelName('');
      fetchHostels();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create hostel.');
    }
  };

  const handleDeleteHostel = async (hostelId, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This will CASCADE DELETE all blocks, floors, rooms, and bookings!`)) {
      return;
    }
    try {
      await api.delete(`/admin/hostels/${hostelId}`);
      fetchHostels();
    } catch (err) {
      alert('Failed to delete hostel.');
    }
  };

  const handleClearHostelData = async (hostelId, name) => {
    if (!window.confirm(`CLEAR DATA for "${name}"?\n\nThis will DELETE all blocks, floors, rooms, and bookings under this hostel while PRESERVING the hostel record and student profiles.`)) {
      return;
    }
    try {
      await api.post(`/admin/hostels/${hostelId}/clear`);
      alert(`Cleared all room hierarchy and bookings for ${name}.`);
      fetchHostels();
    } catch (err) {
      alert('Failed to clear hostel data.');
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Create Hostel Form Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-amber-500" />
          Create New Hostel Entry
        </h2>

        <form onSubmit={handleCreateHostel} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Hostel Name</label>
            <input
              type="text"
              placeholder="e.g. Nilgiri Hostel"
              value={newHostelName}
              onChange={(e) => setNewHostelName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Gender</label>
            <select
              value={newGender}
              onChange={(e) => setNewGender(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Start Time</label>
            <input
              type="datetime-local"
              value={newStartTime}
              onChange={(e) => setNewStartTime(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">End Time</label>
            <input
              type="datetime-local"
              value={newEndTime}
              onChange={(e) => setNewEndTime(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>

          <div className="lg:col-span-5 flex justify-end pt-2">
            <button
              type="submit"
              className="py-2.5 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition text-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Hostel
            </button>
          </div>
        </form>
      </div>

      {/* Hostel Management & Filter List */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-500" />
              Hostels Directory
            </h2>
            <p className="text-xs text-slate-500">Manage time windows, gender criteria, or clear hostel hierarchy data.</p>
          </div>

          {/* Admin Filter Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
              <Filter className="w-4 h-4 text-amber-500" />
              <span>Filter Gender:</span>
            </div>

            <select
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-medium"
            >
              <option value="ALL">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
        </div>

        {/* Hostels List Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
                <th className="p-3.5">ID</th>
                <th className="p-3.5">Hostel Name</th>
                <th className="p-3.5">Gender</th>
                <th className="p-3.5">Active Time Window</th>
                <th className="p-3.5">Blocks</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {hostels.map((h) => {
                const now = new Date();
                const isActive = now >= new Date(h.start_time) && now <= new Date(h.end_time);

                return (
                  <tr key={h.hostel_id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 font-bold text-slate-400">#{h.hostel_id}</td>
                    <td className="p-3.5 font-bold text-slate-900">{h.name}</td>
                    <td className="p-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${
                        h.allowed_gender === 'Female' ? 'bg-pink-50 text-pink-700 border border-pink-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {h.allowed_gender}
                      </span>
                    </td>
                    <td className="p-3.5 text-xs">
                      <span className={`px-2 py-0.5 rounded-full font-semibold uppercase text-[10px] mr-2 ${isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {isActive ? 'Active Window' : 'Closed / Inactive'}
                      </span>
                      <div className="text-slate-500 mt-1">
                        {new Date(h.start_time).toLocaleString()} → {new Date(h.end_time).toLocaleString()}
                      </div>
                    </td>
                    <td className="p-3.5 text-xs font-semibold text-slate-600">
                      {h.Blocks ? h.Blocks.length : 0} Blocks
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      <button
                        onClick={() => setActiveSettingsHostel(h)}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        Settings
                      </button>

                      <button
                        onClick={() => handleClearHostelData(h.hostel_id, h.name)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-amber-500 hover:text-white text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition"
                        title="Delete blocks, floors, rooms, and bookings under this hostel"
                      >
                        <Trash className="w-3.5 h-3.5" />
                        Clear Data
                      </button>

                      <button
                        onClick={() => handleDeleteHostel(h.hostel_id, h.name)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {hostels.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 text-sm">
                    No hostels found matching the specified filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Settings Modal */}
      {activeSettingsHostel && (
        <SettingsModal
          hostel={activeSettingsHostel}
          onClose={() => setActiveSettingsHostel(null)}
          onSaveSuccess={fetchHostels}
        />
      )}
    </div>
  );
};

export default HostelManager;
